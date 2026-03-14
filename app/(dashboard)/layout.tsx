"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { createClient } from "@/lib/supabase/client";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState<string | undefined>();
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);

  useEffect(() => {
    async function loadUserData() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email);
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();
        if (profile?.full_name) setUserName(profile.full_name);
      }

      // Unread messages count
      const { count: msgCount } = await supabase
        .from("contact_messages")
        .select("*", { count: "exact", head: true })
        .eq("leido", false);
      setUnreadMessages(msgCount ?? 0);

      // Pending orders count
      const { count: orderCount } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      setPendingOrders(orderCount ?? 0);
    }
    loadUserData();
  }, []);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-primary)" }}>
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        unreadMessages={unreadMessages}
        pendingOrders={pendingOrders}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          userName={userName}
          userEmail={userEmail}
          unreadMessages={unreadMessages}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
