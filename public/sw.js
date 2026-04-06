self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title ?? "104th Helmet Armoury", {
      body: data.body ?? "",
      icon: "/logo.png",
      badge: "/logo.png",
      data: { url: data.url ?? "/armoury/me" },
    })
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const url = event.notification.data?.url ?? "/armoury/me"
      const existing = clientList.find((c) => c.url.includes(url) && "focus" in c)
      if (existing) return existing.focus()
      return clients.openWindow(url)
    })
  )
})
