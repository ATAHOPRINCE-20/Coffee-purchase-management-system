import { useState, useEffect } from "react";
import { Layout } from "../components/Layout";
import { 
  Bell, Send, Mail, MessageSquare, 
  Smartphone, Filter, Search, Loader2,
  CheckCircle2, AlertTriangle, History
} from "lucide-react";
import { notificationService, NotificationLog } from "../services/notificationService";

export default function NotificationLogPage() {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);

  useEffect(() => {
    notificationService.getLogs().then(data => {
      setLogs(data);
      setLoading(false);
    });
  }, []);

  const handleManualTrigger = async () => {
    if (!confirm("Are you sure you want to trigger monthly balance notifications for and all farmers with outstanding balances?")) return;
    
    setTriggering(true);
    try {
      await notificationService.triggerMonthlyBalanceNotifications();
      alert("Manual notification trigger initiated successfully.");
    } catch (err) {
      alert("Failed to trigger notifications.");
    } finally {
      setTriggering(false);
    }
  };

  return (
    <Layout
      breadcrumbs={[{ label: "System" }, { label: "Notifications" }]}
      title="Notification Center"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <History size={18} className="text-gray-400" />
              Recent Logs
            </h3>
            <div className="flex gap-2">
              <button className="p-2 bg-gray-50 rounded-lg text-gray-500 hover:bg-gray-100">
                <Filter size={16} />
              </button>
            </div>
          </div>
          
          <div className="space-y-4">
            {loading ? (
              <div className="py-12 text-center">
                <Loader2 className="w-8 h-8 text-green-700 animate-spin mx-auto mb-2" />
                <p className="text-gray-500 text-sm">Loading message history...</p>
              </div>
            ) : logs.map(log => (
              <div key={log.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl bg-gray-50 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-gray-400 border border-gray-100">
                    {log.type === 'SMS' && <Smartphone size={18} />}
                    {log.type === 'WhatsApp' && <MessageSquare size={18} />}
                    {log.type === 'Email' && <Mail size={18} />}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900">{log.farmer_name}</div>
                    <div className="text-xs text-gray-500 truncate max-w-[200px]">{log.content}</div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{log.type}</div>
                    <div className="text-xs text-gray-500">{new Date(log.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    log.status === 'Sent' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {log.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[#14532D] text-white rounded-2xl p-6 shadow-lg relative overflow-hidden">
            <Bell className="absolute -right-4 -bottom-4 w-24 h-24 opacity-10" />
            <h3 className="font-bold text-lg mb-2">Automated Alerts</h3>
            <p className="text-sm text-green-100 mb-6 leading-relaxed">
              System is configured to send monthly balance notices via SMS, WhatsApp, and Email.
            </p>
            <button
              onClick={handleManualTrigger}
              disabled={triggering}
              className="w-full py-3 bg-white text-[#14532D] rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-50 transition-all disabled:opacity-50"
            >
              {triggering ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              Manual Trigger
            </button>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3 text-amber-800">
              <AlertTriangle size={18} />
              <h4 className="text-sm font-bold">API Status</h4>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-amber-700">Twilio (SMS/WA)</span>
                <span className="flex items-center gap-1 font-bold text-green-700"><CheckCircle2 size={10} /> Operational</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-amber-700">Resend (Email)</span>
                <span className="flex items-center gap-1 font-bold text-green-700"><CheckCircle2 size={10} /> Operational</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
