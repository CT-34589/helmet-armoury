import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

type Item = { name: string; label: string; subCategory?: string; requirement?: string; note?: string }

const slug = (s: string) =>
  s.toLowerCase().replace(/[\n\r]+/g, " ").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 80)

async function upsert(category: string, items: Item[]) {
  for (let i = 0; i < items.length; i++) {
    const it = items[i]
    const name = slug(it.name)
    await prisma.configItem.upsert({
      where: { category_name: { category, name } },
      update: { label: it.label, subCategory: it.subCategory ?? null, requirement: it.requirement ?? null, note: it.note ?? null, sortOrder: i },
      create: { category, name, label: it.label, subCategory: it.subCategory ?? null, requirement: it.requirement ?? null, note: it.note ?? null, sortOrder: i },
    })
  }
}

async function main() {
  // ── Helmet Types ──────────────────────────────────────────
  await upsert("helmetType", [
    { name: "Phase 1 Clone Trooper", label: "Phase 1 Clone Trooper" },
    { name: "Phase 2 Clone Trooper", label: "Phase 2 Clone Trooper" },
    { name: "ARC Trooper", label: "ARC Trooper" },
    { name: "ARF Trooper", label: "ARF Trooper" },
    { name: "Aerial Trooper", label: "Aerial Trooper" },
    { name: "AT-RT Driver", label: "AT-RT Driver" },
    { name: "Bomb Squad", label: "Bomb Squad" },
    { name: "Clone Commander", label: "Clone Commander" },
    { name: "Clone Medic", label: "Clone Medic" },
    { name: "Clone Pilot", label: "Clone Pilot" },
    { name: "Clone Scout", label: "Clone Scout" },
    { name: "Clone Sharpshooter", label: "Clone Sharpshooter" },
    { name: "SCUBA Trooper", label: "SCUBA Trooper" },
  ])

  // ── Class Decals ──────────────────────────────────────────
  const classDecals: Item[] = [
    { name: "Assault Class Decal", label: "Assault Class Decal", requirement: "Obtain level 750 with the Assault class + Assault Trooper" },
    { name: "Heavy Class Decal", label: "Heavy Class Decal", requirement: "Obtain level 750 with the Heavy class + Heavy Trooper" },
    { name: "Officer Class Decal", label: "Officer Class Decal", requirement: "Obtain level 750 with the Officer class + >SGT or Medic" },
    { name: "Specialist Class Decal", label: "Specialist Class Decal", requirement: "Obtain level 750 with the Specialist class + Specialist Trooper" },
    { name: "ARF Class Decal", label: "ARF Class Decal", requirement: "(ARF Troopers) Obtain level 750 with all 3 Classes" },
    { name: "Tanker Class Decal", label: "Tanker Class Decal", requirement: "Obtain level 750 with Tank + Tank Qual" },
    { name: "Rifleman Class Decal", label: "Rifleman Class Decal", requirement: "Obtain Max Assault + Rifleman" },
    { name: "Anti Armour Class Decal", label: "Anti Armour Class Decal", requirement: "Obtain Max Heavy + Anti Armour" },
    { name: "Cyclones Decal", label: "Cyclones Decal", requirement: "Obtain Max Heavy + Max Tank" },
    { name: "Marksman Class Decal", label: "Marksman Class Decal", requirement: "Obtain Max Specialist + Marksman" },
    { name: "AT-RT Wolf of the Huntress", label: "AT-RT Wolf of the Huntress", requirement: "Become an AT-RT Driver within the 60th Reconnaissance Company" },
    { name: "ARC-170 Class Decal", label: "ARC-170 Class Decal", requirement: "Obtain level 120 with the ARC-170 + Fighter" },
    { name: "V-Wing Class Decal", label: "V-Wing Class Decal", requirement: "Obtain level 120 with the V-Wing + Interceptor" },
    { name: "Y-Wing Class Decal", label: "Y-Wing Class Decal", requirement: "Obtain level 120 with the Y-Wing + Bomber" },
    { name: "Master Pilot Decal", label: "Master Pilot Decal", requirement: "Obtain level 120 with all 3 pilot classes + SFC" },
    { name: "Aerial Class Decal", label: "Aerial Class Decal", requirement: "Obtain Level 1000 with Aerial + Aerial Qual" },
    { name: "Sharpshooter of the Skies Decal", label: "Sharpshooter of the Skies Decal", requirement: "Obtain 160 Eliminations within 1 Ground and 1 Ship phase as an Advanced Aerial. Minimum Score 64k" },
    { name: "Speeder I Decal", label: "Speeder I Decal", requirement: "Reach level 150 with the BARC speeder" },
    { name: "Speeder II Decal", label: "Speeder II Decal", requirement: "Reach level 400 with the BARC speeder" },
    { name: "Advanced Tanker Decal", label: "Advanced Tanker Decal (ON HOLD)", requirement: "Become an Advanced Tanker", note: "ON HOLD" },
  ].map((d) => ({ ...d, subCategory: "Class Decals" }))

  // ── Instructor Decals ─────────────────────────────────────
  const instructorDecals: Item[] = [
    { name: "Rifleman Instructor Decal", label: "Rifleman Instructor Decal", requirement: '"Shattering shot" : Become a certified Rifleman Instructor' },
    { name: "Rifleman Cadre Decal", label: "Rifleman Cadre Decal", requirement: '"Hooded Skull" : Become a certified Rifleman Cadre, or receive it from your Cadre for impressive feats' },
    { name: "Anti Armour Instructor Decal", label: "Anti Armour Instructor Decal", requirement: '"Piercing Chrysalis" : Become a certified Anti Armour Instructor' },
    { name: "Anti Armour Cadre Decal", label: "Anti Armour Cadre Decal", requirement: '"Horned Skull" : Become a certified Anti Armour Cadre, or receive it from your Cadre for impressive feats' },
    { name: "Marksman Instructor Decal", label: "Marksman Instructor Decal", requirement: '"Scope of the Republic" : Become a certified Marksman Instructor' },
    { name: "Marksman Cadre Decal", label: "Marksman Cadre Decal", requirement: '"Targeting Skull" : Become a certified Marksman Cadre, or receive it from your Cadre for impressive feats' },
    { name: "ARF Instructor Decal", label: "ARF Instructor Decal", requirement: '"Loth Wolf" : Become a certified ARF Instructor' },
    { name: "ARF Cadre Decal", label: "ARF Cadre Decal", requirement: '"Stomping Skull": Become a certified ARF Cadre, or receive it from your Cadre for impressive feats' },
    { name: "Aerial Instructor Decal", label: "Aerial Instructor Decal", requirement: '"Flying Wolf" : Become a certified Aerial Instructor whilst being apart of the Regular Army' },
    { name: "Aerial Cadre Decal", label: "Aerial Cadre Decal", requirement: '"Winged Skull" : Become a certified Aerial Cadre, or receive it from your Cadre for impressive feats' },
    { name: "Medic Instructor Decal", label: "Medic Instructor Decal", requirement: '"Caduceus" : Become a certified Medic Instructor' },
    { name: "Medic Cadre Decal", label: "Medic Cadre Decal", requirement: '"Slithering Skull" : Become a certified Medic Cadre, or receive it from your Cadre for impressive feats' },
  ].map((d) => ({ ...d, subCategory: "Instructor Decals" }))

  // ── Starfighter Decals ────────────────────────────────────
  const starfighterDecals: Item[] = [
    { name: "ARC-170 Proficiency Decal", label: "ARC-170 Proficiency Decal", requirement: "Obtain level 300 with the Fighter class + achieve ARC-170 Stalker qualification" },
    { name: "V-Wing Proficiency Decal", label: "V-Wing Proficiency Decal", requirement: "Obtain level 300 with the Interceptor class + achieve V-Wing Prowler qualification" },
    { name: "Y-Wing Proficiency Decal", label: "Y-Wing Proficiency Decal", requirement: "Obtain level 300 with the Bomber class + achieve Y-Wing Bomber qualification" },
    { name: "Gladious Warrior Decal", label: "Gladious Warrior Decal", requirement: "Obtain max level with all three base Classes (not including qualifications)" },
    { name: "Twin Falcon Decal", label: "Twin Falcon Decal", requirement: "Obtain all 3 Qualifications [Y-Wing Bomber, ARC-170 Stalker, V-Wing Prowler]" },
    { name: "King of the Skies Decal", label: "King of the Skies Decal", requirement: "Obtain 40k score in a single match of Galactic Assault using only a starfighter" },
    { name: "Talon Hunter Decal", label: "Talon Hunter Decal", requirement: "100+ eliminations SFA (non dead lobby +5 People in each teams)" },
    { name: "Pin Pointed Decal", label: "Pin Pointed Decal", requirement: "20K+ objective score SFA (non dead lobby +5 People in each teams)" },
    { name: "Pilots Star Decal", label: "Pilots Star Decal", requirement: "Host 100 sorties. \"Vouching\" will not be accepted as proof." },
    { name: "Ace Pilot Instructor Decal", label: "Ace Pilot Instructor Decal", requirement: "Become an Ace Instructor, Ace Head Instructor or Ace Cadre." },
    { name: "Starfighter Aerial Instructor Decal", label: "Starfighter Aerial Instructor Decal", requirement: "Become an Aerial Instructor whilst being apart of the Starfighter Corps." },
    { name: "Naval Veteran Loyalty Decal", label: "Naval Veteran Loyalty Decal", requirement: "Be apart of the Starfighter Corps consistently for 1 year and 2 months." },
    { name: "Starfighter Jaig Eyes Decal", label: "Starfighter Jaig Eyes Decal", requirement: "Most prestigious decal ever awarded in the Starfighter Corps. Must meet all decal requirements.", note: "PRESTIGIOUS" },
  ].map((d) => ({ ...d, subCategory: "Starfighter Decals" }))

  // ── 104th Insignias ───────────────────────────────────────
  const insigniaDecals: Item[] = [
    { name: "104th Veteran Decal", label: "104th Veteran Decal", requirement: "Have joined the 104th before the 10th of April 2019" },
    { name: "104th Comet Insignia Decal", label: "104th Comet Insignia Decal", requirement: "Have joined the 104th before the 10th of October 2019 (and still in active unit currently)" },
    { name: "104th Insignia Decal", label: "104th Insignia Decal", requirement: "Have joined the 104th before 10th of October 2020, been CPL or above" },
    { name: "Veteran Trooper Design", label: "Veteran Trooper Design", requirement: "Be declared as raid MVP 20 times (starting from 16/4/2023)" },
    { name: "Wolf Eyes Design", label: "Wolf Eyes Design", requirement: "Top 3 of entire leaderboard in a 12 man+ 104th raid 30 times (starting from 16/4/2023)" },
  ].map((d) => ({ ...d, subCategory: "104th Insignias" }))

  // ── Art Team Decals ───────────────────────────────────────
  const artTeamDecals: Item[] = [
    { name: "Art Team Level 1 Decal", label: "Art Team Level 1 Decal", requirement: "Be in the Art Team 2 months and do 30 Trooper Pieces" },
    { name: "Art Team Level 2 Decal", label: "Art Team Level 2 Decal", requirement: "Be in the Art Team 4 months and do 50+ overall pieces" },
    { name: "Art Team Level 3 Decal", label: "Art Team Level 3 Decal", requirement: "Be in the Art Team 8 months and do 50+ Helmets" },
  ].map((d) => ({ ...d, subCategory: "Art Team Decals" }))

  await upsert("decal", [...classDecals, ...instructorDecals, ...starfighterDecals, ...insigniaDecals, ...artTeamDecals])

  // ── Trooper Designs ───────────────────────────────────────
  const trooperDesigns: Item[] = [
    // Join Date
    { name: "00-Spikes of Loyalty Design", label: "Spikes of Loyalty", subCategory: "Join Date", requirement: "Joined the 104th during 2023" },
    { name: "01-Fangs of Loyalty Design", label: "Fangs of Loyalty", subCategory: "Join Date", requirement: "Joined the 104th during 2022" },
    { name: "02-Stripes of Loyalty Design", label: "Stripes of Loyalty", subCategory: "Join Date", requirement: "Joined the 104th during 2021" },
    { name: "03-Tears of Loyalty Design", label: "Tears of Loyalty", subCategory: "Join Date", requirement: "Joined the 104th during 2020" },
    { name: "04-Arrow of Loyalty Design", label: "Arrow of Loyalty", subCategory: "Join Date", requirement: "Joined the 104th during 2019" },
    // Officer Awarded
    { name: "05-We The Few Design", label: "We The Few", subCategory: "Officer Awarded", requirement: "Awarded by Army/SFC Command for unforgettable feats" },
    { name: "06-Live to Fight Another Day Design", label: "Live to Fight Another Day", subCategory: "Officer Awarded", requirement: "Awarded by High Officers for impressive feats in battle" },
    { name: "07-Good Soldiers Follow Orders Design", label: "Good Soldiers Follow Orders", subCategory: "Officer Awarded", requirement: "Be Awarded MVP of a Raid by a SGT+" },
    { name: "08-May the Force Be With You Decal", label: "May the Force Be With You", subCategory: "Officer Awarded", requirement: "Participated in a 104th meet up of 3 or more people" },
    { name: "Artists Blessings", label: "Artists Blessings", subCategory: "Officer Awarded", requirement: "Awarded by Members of the Art Team for creative achievements" },
    // Raid Rewards
    { name: "09-Clanker Buster Design", label: "Clanker Buster", subCategory: "Raid Rewards", requirement: "Take part in 200 104th Main Server Raids" },
    { name: "10-Mark of Brotherhood Design", label: "Mark of Brotherhood", subCategory: "Raid Rewards", requirement: "Take part in 100 104th Main Server Raids" },
    { name: "11-Battle Hardened Design", label: "Battle Hardened", subCategory: "Raid Rewards", requirement: "Take part in 50 104th Main Server Raids" },
    { name: "12-Leadership Commendation Design", label: "Leadership Commendation", subCategory: "Raid Rewards", requirement: "Lead over 50 raids in the 104th Main Server Raids" },
    { name: "For The Republic", label: "For The Republic", subCategory: "Raid Rewards", requirement: "Host 150 Raids (Squad, Platoon, and Main Server Raids count)" },
    { name: "13-Battle Tears Design", label: "Battle Tears", subCategory: "Raid Rewards", requirement: "Obtain 100 eliminations in a 104th raid prior to boarding the ship, with base class and weaponry" },
    { name: "14-Stripes of Valour Design", label: "Stripes of Valour", subCategory: "Raid Rewards", requirement: "Manage to pass a qualification in less than 4 attempts" },
    { name: "15-Fangs of Dedication Design", label: "Fangs of Dedication", subCategory: "Raid Rewards", requirement: "Have over 10k messages in the Main Server" },
    { name: "16-Troopers Calling Design", label: "Troopers Calling", subCategory: "Raid Rewards", requirement: "Have over 1k messages in the Main Server and Unit Server" },
    { name: "17-Horns of Resilience Design", label: "Horns of Resilience", subCategory: "Raid Rewards", requirement: "Attendance in a 104th Operation (Barycir, Akalenedat, Oyula Shukalar)" },
    { name: "Red vs Blue Design", label: "Red vs Blue", subCategory: "Raid Rewards", requirement: "Have been part of the Red vs Blue event (RvB Medal as proof)" },
    { name: "Tusks of Achievement", label: "Tusks of Achievement", subCategory: "Raid Rewards", requirement: "Have 7+ Medals in the Main Server awarded to you" },
    // Service Rewards
    { name: "18-Time Well Spent Design", label: "Time Well Spent", subCategory: "Service Rewards", requirement: "3 consecutive years in the 104th" },
    { name: "19-Scars of Tenacity Design", label: "Scars of Tenacity", subCategory: "Service Rewards", requirement: "2 consecutive years in a platoon" },
    { name: "Loyal Beginnings", label: "Loyal Beginnings", subCategory: "Service Rewards", requirement: "3 consecutive years in a platoon" },
    { name: "Totem of the Loyal", label: "Totem of the Loyal", subCategory: "Service Rewards", requirement: "4 consecutive years in a platoon" },
    { name: "20-Token of Leadership Design", label: "Token of Leadership", subCategory: "Service Rewards", requirement: "2 consecutive years as platoon staff" },
    { name: "21-Wolf's Fangs Design", label: "Wolf's Fangs", subCategory: "Service Rewards", requirement: "1 consecutive year with your current class" },
    { name: "22-Wolf Teeth Design", label: "Wolf Teeth", subCategory: "Service Rewards", requirement: "1 consecutive year as staff in Main Server" },
    { name: "23-Cost of Glory Design", label: "Cost of Glory", subCategory: "Service Rewards", requirement: "1 consecutive year as CPL+ / FL+, Retired as SGT+ / FCPT+" },
    { name: "24-Staff Veteran Design", label: "Staff Veteran", subCategory: "Service Rewards", requirement: "Army: 4 consecutive months as CPL+ / SFC: 4 consecutive months as FL+" },
    { name: "25-Mark of Strength Design", label: "Mark of Strength", subCategory: "Service Rewards", requirement: "Be in no more than 2 platoons during your time in the 104th" },
    // Team/Group
    { name: "26-Darks Chosen Design", label: "Dark's Chosen", subCategory: "Team / Group", requirement: "2 years on the 104th art team or awarded by art team commander" },
    { name: "27-Mark of Pride Design", label: "Mark of Pride", subCategory: "Team / Group", requirement: "Be an active member of an official 104th team (Admin, Art, Media, Modding, KSF, etc)" },
    { name: "28-KSF Symbol Decal", label: "KSF Symbol", subCategory: "Team / Group", requirement: "1 Year in KSF" },
    { name: "29-KSF Stripes Design", label: "KSF Stripes", subCategory: "Team / Group", requirement: "6 months in KSF" },
    { name: "Admins Finest Decal", label: "Admins Finest", subCategory: "Team / Group", requirement: "Be an active member within the Administrations Team" },
    // Veteran Class
    { name: "30-Boil it Down Decal", label: "Boil it Down", subCategory: "Veteran Class", requirement: "Army: Maxed assault for over a year / SFC: Maxed ARC-170 for over a year" },
    { name: "31-Bigger Fish Decal", label: "Bigger Fish", subCategory: "Veteran Class", requirement: "Army: Maxed heavy for over a year / SFC: Maxed Y-Wing for over a year" },
    { name: "32-Eyes on the Prize Decal", label: "Eyes on the Prize", subCategory: "Veteran Class", requirement: "Army: Maxed specialist for over a year / SFC: Max V-Wing for over a year" },
    // Old Class
    { name: "34-Mauler Design", label: "Mauler", subCategory: "Old Class", requirement: "Army: Must have passed ATP when active / SFC: Passed Advanced Quals" },
    // January 2025 Batch
    { name: "Stripe of the Storm", label: "Stripe of the Storm", subCategory: "January 2025", requirement: "First place overall, Base class only, in a raid on Kamino. 3 Times. In 2025" },
    { name: "Stripe of the Sarlacc", label: "Stripe of the Sarlacc", subCategory: "January 2025", requirement: "First place overall, Base class only, in a raid on Felucia. 3 Times. In 2025" },
    { name: "Stripe of the Senator", label: "Stripe of the Senator", subCategory: "January 2025", requirement: "First place overall, Base class only, in a raid on Naboo. 3 Times. In 2025" },
    { name: "Stripe of the Forest", label: "Stripe of the Forest", subCategory: "January 2025", requirement: "First place overall, Base class only, in a raid on Kashyyyk. 3 Times. In 2025" },
    { name: "Stripe of the Sands", label: "Stripe of the Sands", subCategory: "January 2025", requirement: "First place overall, Base class only, in a raid on Geonosis. 3 Times. In 2025" },
    { name: "Hooded Deadshot Decal", label: "Hooded Deadshot", subCategory: "January 2025", requirement: "Obtain 135 Eliminations as a Rifleman playing Assault within one ground and ship phase. Min 53k score. In 2025" },
    { name: "Anti-Personnel Decal", label: "Anti-Personnel", subCategory: "January 2025", requirement: "Obtain 135 Eliminations as an AA playing Heavy within one ground and ship phase. Min 53k score. In 2025" },
    { name: "Pinpoint Decal", label: "Pinpoint", subCategory: "January 2025", requirement: "Obtain 135 Eliminations as a Marksman playing Specialist within one ground and ship phase. Min 53k score. In 2025" },
    { name: "Slash of the Strong", label: "Slash of the Strong", subCategory: "January 2025", requirement: "As an AA playing Heavy, obtain 200 Eliminations in a Main Server raid. Min score 80k. In 2025" },
    { name: "Horns of the Heavy", label: "Horns of the Heavy", subCategory: "January 2025", requirement: "As an AA playing Heavy, get first place overall in a Main Server Raid (SF excluded). In 2025" },
    { name: "Unkillable", label: "Unkillable", subCategory: "January 2025", requirement: "As an AA playing Heavy, obtain a 25 killstreak in a Main Server Raid. Min score per kill 450. In 2025" },
    { name: "A Heavys Best", label: "A Heavy's Best", subCategory: "January 2025", requirement: "Pass the AA-Trial on your first attempt on your console. In 2025" },
    { name: "Deaths Fangs", label: "Death's Fangs", subCategory: "January 2025", requirement: "As a Marksman playing Specialist, obtain 200 kills in a Main Server Raid. Min score 80k. In 2025" },
    { name: "Deadeye Horns", label: "Deadeye Horns", subCategory: "January 2025", requirement: "As a Marksman playing Specialist, get first place overall in a Main Server Raid (SF excluded). In 2025" },
    { name: "Dash of Achievement", label: "Dash of Achievement", subCategory: "January 2025", requirement: "Pass the Marksman-Trial on your first attempt on your console. In 2025" },
    { name: "Spikes of the Marksman", label: "Spikes of the Marksman", subCategory: "January 2025", requirement: "As a Marksman playing Specialist, obtain a 30 killstreak in a Main Server Raid. Min score per kill 400. In 2025" },
    { name: "Lethal Eyes Design", label: "Lethal Eyes", subCategory: "January 2025", requirement: "Achieve first place overall in a Main Server Blast Raid. Minimum 4 104th Troopers each side. In 2025" },
    { name: "Survivors Skull Design", label: "Survivor's Skull", subCategory: "January 2025", requirement: "Achieve Victory in a Main Server Raid that lasted 3+ ground and ship phases, present entire duration. In 2025" },
    { name: "Spikes of Honour Design", label: "Spikes of Honour", subCategory: "January 2025", requirement: "Achieve 20+ Attendance within 1 attendance period. In 2025" },
    { name: "Always Around Design", label: "Always Around", subCategory: "January 2025", requirement: "Exceed Attendance requirements for 6 attendance periods in a row (LOA/NFFC breaks streak). In 2025" },
    { name: "Vision of the Wartorn Design", label: "Vision of the Wartorn", subCategory: "January 2025", requirement: "Stay at the same Rank for 8+ months (LCPL+). In 2025" },
    { name: "Wisdoms Beginnings Decal", label: "Wisdom's Beginnings", subCategory: "January 2025", requirement: "Awarded to all Fireteam Leaders. In 2025" },
  ]
  await upsert("design", trooperDesigns)

  // ── Class Mastery Designs ─────────────────────────────────
  const masteryDesigns: Item[] = [
    { name: "Aerial Mastery Design", label: "Aerial Mastery", requirement: "Have the Aerial Qualification for 6 months and have it maxed out (level 1000) in Battlefront 2" },
    { name: "Class Mastery Design", label: "Class Mastery", requirement: "Have all 3 base classes maxed out (level 1000) in Battlefront 2" },
    { name: "Assault Mastery Design", label: "Assault Mastery (2x Slots)", requirement: "Assault for 6 months + Level 1000 Class. Must currently be Assault" },
    { name: "Heavy Mastery Design", label: "Heavy Mastery (2x Slots)", requirement: "Heavy for 6 months + Level 1000 Class. Must currently be Heavy" },
    { name: "Specialist Mastery Design", label: "Specialist Mastery", requirement: "Specialist for 6 months + Level 1000 Class. Must currently be Specialist" },
    { name: "Rifleman Mastery Design", label: "Rifleman Mastery (2x Slots)", requirement: "Rifleman for 6 months + Level 1000 Class" },
    { name: "Anti Armour Mastery Design", label: "Anti Armour Mastery (2x Slots)", requirement: "Anti Armour for 6 months + Level 1000 Class" },
    { name: "Marksman Mastery Design", label: "Marksman Mastery (2x Slots)", requirement: "Marksman for 6 months + Level 1000 Class" },
    { name: "Fighter Mastery Design", label: "Fighter Mastery (2x Slots)", requirement: "Fighter for 6 months + MAX Fighter. 2 Slots (top and centre)" },
    { name: "Interceptor Mastery Design", label: "Interceptor Mastery (2x Slots)", requirement: "Fighter for 6 months + MAX Interceptor. 2 Slots (top and centre)" },
    { name: "Bomber Mastery Design", label: "Bomber Mastery (2x Slots)", requirement: "Fighter for 6 months + MAX Bomber. 2 Slots (top and centre)" },
  ].map((d) => ({ ...d, subCategory: "Class Mastery" }))
  await upsert("design", masteryDesigns)

  // ── Platoon Legacy Designs ────────────────────────────────
  const platoonLegacy: Item[] = [
    // Rancor Company
    { name: "Rancor Company Decal", label: "Rancor Company", subCategory: "Platoon Legacy — Rancor", requirement: "A part of Unit when it was shut down" },
    // Ares Company
    { name: "Howler Platoon Legacy Design", label: "Howler Platoon Legacy", subCategory: "Platoon Legacy — Ares", requirement: "1 Year Service inside of Platoon, or given by Platoon CO/XO/NCO for Loyalty and Commitment" },
    { name: "Taurus Platoon Legacy Design", label: "Taurus Platoon Legacy", subCategory: "Platoon Legacy — Ares", requirement: "1 Year Service inside of Platoon, or given by Platoon CO/XO/NCO for Loyalty and Commitment" },
    { name: "Sentinel Platoon Legacy Design", label: "Sentinel Platoon Legacy", subCategory: "Platoon Legacy — Ares", requirement: "Apart of Unit when they shut down" },
    // Reaper Company
    { name: "Cerberus Platoon Legacy Design", label: "Cerberus Platoon Legacy", subCategory: "Platoon Legacy — Reaper", requirement: "Apart of Unit when they shut down" },
    { name: "Ghost Platoon Legacy Design", label: "Ghost Platoon Legacy", subCategory: "Platoon Legacy — Reaper", requirement: "Apart of Unit when they shut down" },
    { name: "Scrapper Platoon Legacy Design", label: "Scrapper Platoon Legacy", subCategory: "Platoon Legacy — Reaper", requirement: "1 Year Service inside of Platoon, or given by Platoon CO/XO/NCO for Loyalty and Commitment" },
    // Havoc Company
    { name: "Dagger Platoon Legacy Design", label: "Dagger Platoon Legacy", subCategory: "Platoon Legacy — Havoc", requirement: "Apart of Unit when they shut down" },
    { name: "Fenrir Platoon Legacy Design", label: "Fenrir Platoon Legacy", subCategory: "Platoon Legacy — Havoc", requirement: "Apart of Unit when they shut down" },
    { name: "Titan Platoon Legacy Design", label: "Titan Platoon Legacy", subCategory: "Platoon Legacy — Havoc", requirement: "1 Year Service inside of Platoon, or given by Platoon CO/XO/NCO for Loyalty and Commitment" },
    // Monarch Company
    { name: "Ravager Platoon Legacy Design", label: "Ravager Platoon Legacy", subCategory: "Platoon Legacy — Monarch", requirement: "Apart of Unit when they shut down" },
    { name: "Ice Platoon Legacy Design", label: "Ice Platoon Legacy", subCategory: "Platoon Legacy — Monarch", requirement: "1 Year Service inside of Platoon, or given by Platoon CO/XO/NCO for Loyalty and Commitment" },
    { name: "Hound Platoon Legacy Design", label: "Hound Platoon Legacy", subCategory: "Platoon Legacy — Monarch", requirement: "1 Year Service inside of Platoon, or given by Platoon CO/XO/NCO for Loyalty and Commitment" },
    // Valkyrie Company
    { name: "Ragnarok Platoon Legacy Design", label: "Ragnarok Platoon Legacy", subCategory: "Platoon Legacy — Valkyrie", requirement: "Apart of Unit when they shut down" },
    { name: "Solstice Platoon Legacy Design", label: "Solstice Platoon Legacy", subCategory: "Platoon Legacy — Valkyrie", requirement: "1 Year Service inside of Platoon, or given by Platoon CO/XO/NCO for Loyalty and Commitment" },
    { name: "Dawn Platoon Legacy Design", label: "Dawn Platoon Legacy", subCategory: "Platoon Legacy — Valkyrie", requirement: "1 Year Service inside of Platoon, or given by Platoon CO/XO/NCO for Loyalty and Commitment" },
    // Horizon Company
    { name: "Corvus Platoon Legacy Design", label: "Corvus Platoon Legacy", subCategory: "Platoon Legacy — Horizon", requirement: "1 Year Service inside of Platoon, or given by Platoon CO/XO/NCO for Loyalty and Commitment" },
    { name: "Iridium Platoon Legacy Design", label: "Iridium Platoon Legacy", subCategory: "Platoon Legacy — Horizon", requirement: "1 Year Service inside of Platoon, or given by Platoon CO/XO/NCO for Loyalty and Commitment" },
    // Vanguard Company
    { name: "Fang Platoon Legacy Design", label: "Fang Platoon Legacy", subCategory: "Platoon Legacy — Vanguard", requirement: "1 Year Service inside of Platoon, or given by Platoon CO/XO/NCO for Loyalty and Commitment" },
    { name: "Storm Platoon Legacy Design", label: "Storm Platoon Legacy", subCategory: "Platoon Legacy — Vanguard", requirement: "1 Year Service inside of Platoon, or given by Platoon CO/XO/NCO for Loyalty and Commitment" },
    { name: "Spectre Platoon Design", label: "Spectre Platoon Legacy", subCategory: "Platoon Legacy — Vanguard", requirement: "1 Year Service inside of Platoon, or given by Platoon CO/XO/NCO for Loyalty and Commitment" },
    // Old Units
    { name: "Garhead Legacy Decal", label: "Garhead Legacy", subCategory: "Platoon Legacy — Old Units", requirement: "Awarded to those who helped in the Garhead Memorial Video" },
    { name: "Apollo Platoon Design", label: "Apollo Platoon Legacy", subCategory: "Platoon Legacy — Old Units", requirement: "Apart of Unit when they shut down" },
    { name: "Eclipse Platoon Decal", label: "Eclipse Platoon Legacy", subCategory: "Platoon Legacy — Old Units", requirement: "Apart of Unit when they shut down" },
    { name: "Arctic Platoon Decal", label: "Arctic Platoon Legacy", subCategory: "Platoon Legacy — Old Units", requirement: "Apart of Unit when they shut down" },
    { name: "Odyssey Platoon Design", label: "Odyssey Platoon Legacy", subCategory: "Platoon Legacy — Old Units", requirement: "Apart of Unit when they shut down" },
    { name: "Phoenix Platoon Design", label: "Phoenix Platoon Legacy", subCategory: "Platoon Legacy — Old Units", requirement: "Apart of Unit when they shut down" },
    { name: "Phoenix Legacy Decal", label: "Phoenix Legacy", subCategory: "Platoon Legacy — Old Units", requirement: "Have been in Phoenix for 2 Months at the time of shut down" },
    { name: "Rampart Platoon Design", label: "Rampart Platoon Legacy", subCategory: "Platoon Legacy — Old Units", requirement: "Apart of Unit when they shut down" },
    { name: "Sparker Platoon Design", label: "Sparker Platoon Legacy", subCategory: "Platoon Legacy — Old Units", requirement: "Apart of Unit when they shut down" },
    { name: "Lightning Platoon Legacy Design", label: "Lightning Platoon Legacy", subCategory: "Platoon Legacy — Old Units", requirement: "Apart of Unit when they shut down" },
  ]
  await upsert("design", platoonLegacy)

  // ── Wing Legacy Designs ───────────────────────────────────
  const wingLegacy: Item[] = [
    { name: "Obsidian Owls 1 Design", label: "Obsidian Owls (1) — Indigo Sqn", subCategory: "Wing Legacy", requirement: "1 Year Service inside of Wing, or given by Wing Command for Loyalty and Commitment. Mainly for Indigo Squadron" },
    { name: "Obsidian Owls 2 Design", label: "Obsidian Owls (2) — Crimson Sqn", subCategory: "Wing Legacy", requirement: "1 Year Service inside of Wing, or given by Wing Command for Loyalty and Commitment. Mainly for Crimson Squadron" },
    { name: "Eagles Talon Design", label: "Eagle's Talon", subCategory: "Wing Legacy", requirement: "1 Year Service inside of Wing, or given by Wing Command for Loyalty and Commitment" },
    { name: "Midnight Ravens Design", label: "Midnight Ravens", subCategory: "Wing Legacy", requirement: "1 Year Service inside of Wing, or given by Wing Command for Loyalty and Commitment" },
    { name: "Sparrows Wing Decal", label: "Sparrow's Wing", subCategory: "Wing Legacy", requirement: "Apart of Unit when they shut down" },
  ]
  await upsert("design", wingLegacy)

  console.log("✓ Seeded all config items from CSVs")
}

main().catch(console.error).finally(() => prisma.$disconnect())
