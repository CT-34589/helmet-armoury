import NextAuth from "next-auth"
import Discord from "next-auth/providers/discord"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "./prisma"
import { checkDiscordRoles } from "./discord-roles"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Discord({
      clientId: process.env.AUTH_DISCORD_ID!,
      clientSecret: process.env.AUTH_DISCORD_SECRET!,
      authorization: {
        params: { scope: "identify email guilds.members.read" },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "discord" || !account.providerAccountId) return true

      try {
        // Blacklist check before anything else
        const existing = await prisma.user.findFirst({
          where: { discordId: account.providerAccountId },
          select: { isBlacklisted: true },
        })
        if (existing?.isBlacklisted) return false

        // Fetch all role data from Discord in one pass
        const roleData = account.access_token
          ? await checkDiscordRoles(account.access_token)
          : null

        // Block inactive members (no company or staff role)
        if (roleData && !roleData.isActiveMember) {
          return "/unauthorized?reason=inactive"
        }

        // Resolve clearances — check which clearances list this user's ID as a member
        let userClearances: string[] = []
        if (roleData?.isArtTeam) {
          try {
            const clearanceDefs = await prisma.artTeamClearance.findMany()
            userClearances = clearanceDefs
              .filter((c) => {
                const ids = JSON.parse(c.memberIds) as string[]
                return ids.includes(user.id!)
              })
              .map((c) => c.name)
          } catch { /* table may not exist yet */ }
        }

        await prisma.user.update({
          where: { id: user.id! },
          data: {
            discordId: account.providerAccountId,
            discordName: user.name,
            isArtTeam: roleData?.isArtTeam ?? false,
            artTeamTier: roleData?.artTeamTier ?? null,
            discordRoles: JSON.stringify(roleData?.discordRoles ?? []),
            kmcRoles: JSON.stringify(roleData?.kmcRoles ?? []),
            clearances: JSON.stringify(userClearances),
          },
        })
      } catch (err) {
        console.error("[auth] signIn error:", err)
      }
      return true
    },

    async session({ session, user }) {
      try {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: {
            isArtTeam: true,
            artTeamTier: true,
            isBlacklisted: true,
            discordId: true,
            discordRoles: true,
            kmcRoles: true,
            clearances: true,
          },
        })

        // Re-check blacklist on every session load — forces immediate effect
        if (dbUser?.isBlacklisted) {
          // Delete this session to force sign-out
          await prisma.session.deleteMany({ where: { userId: user.id } })
          return null as any
        }

        session.user.id = user.id
        session.user.isArtTeam = dbUser?.isArtTeam ?? false
        session.user.artTeamTier = dbUser?.artTeamTier ?? null
        session.user.isBlacklisted = false
        session.user.discordId = dbUser?.discordId ?? undefined
        session.user.discordRoles = JSON.parse(dbUser?.discordRoles ?? "[]")
        session.user.kmcRoles = JSON.parse(dbUser?.kmcRoles ?? "[]")
        session.user.clearances = JSON.parse(dbUser?.clearances ?? "[]")
      } catch (err) {
        console.error("[auth] session error:", err)
        session.user.id = user.id
        session.user.isArtTeam = false
        session.user.artTeamTier = null
        session.user.isBlacklisted = false
        session.user.discordRoles = []
        session.user.kmcRoles = []
        session.user.clearances = []
      }
      return session
    },
  },
  pages: { signIn: "/", error: "/" },
})

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      isArtTeam: boolean
      artTeamTier: string | null
      isBlacklisted: boolean
      discordId?: string
      discordRoles: string[]
      kmcRoles: string[]
      clearances: string[]
    }
  }
}
