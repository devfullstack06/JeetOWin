import React, { useEffect, useState } from "react";
import {
  Bell,
  Coins,
  Headphones,
  Mail,
  Megaphone,
  MessageCircle,
  Send,
  WalletCards,
} from "lucide-react";
import { affiliateApi } from "../services/affiliateApi";
import { AffiliatePage, StatusBadge, formatMoney } from "../components/AffiliateShared";
import { AdminButton, AdminFilterField } from "../../admin/components/AdminFilterBar/AdminFilterBar";
import "./affiliateNotifications.css";

const SECTION_META = {
  announcements: { icon: Megaphone, tone: "blue" },
  messages: { icon: Mail, tone: "purple" },
  commission: { icon: Coins, tone: "green" },
  withdrawal: { icon: WalletCards, tone: "orange" },
};

export default function AffiliateNotificationsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    affiliateApi
      .getNotifications()
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <AffiliatePage title="Notifications" error={error}>
      {!data ? (
        <div className="jw-adminSkeleton" style={{ height: 80, margin: "12px 0" }} />
      ) : (
        <div className="jw-affNotificationsGrid">
          <Section title="Announcements" items={data.announcements} kind="announcements" />
          <Section title="Personal Messages" items={data.personalMessages} kind="messages" />
          <Section title="Commission Updates" items={data.commissionUpdates} kind="commission" />
          <Section title="Withdrawal Updates" items={data.withdrawalUpdates} kind="withdrawal" />
        </div>
      )}
    </AffiliatePage>
  );
}

function Section({ title, items, kind }) {
  const list = items || [];
  const meta = SECTION_META[kind] || SECTION_META.messages;
  const Icon = meta.icon;

  return (
    <section className="jw-affNotificationsSection">
      <div className="jw-affNotificationsSection__header">
        <span className={`jw-affNotificationsSection__icon is-${meta.tone}`}>
          <Icon size={18} aria-hidden="true" />
        </span>
        <div>
          <h3 className="jw-affNotificationsSection__title">{title}</h3>
          <div className="jw-affNotificationsSection__count">
            {list.length} {list.length === 1 ? "notification" : "notifications"}
          </div>
        </div>
      </div>

      {!list.length ? (
        <div className="jw-affNotificationsEmpty">
          <Bell size={22} aria-hidden="true" />
          <span>You’re all caught up</span>
          <small>New updates will appear here.</small>
        </div>
      ) : (
        <div className="jw-affNotificationsList">
        {list.map((item) => (
          <div
            key={`${kind || "msg"}-${item.id || item.publicId}`}
            className={`jw-affNotificationItem${item.readAt ? "" : " is-unread"}`}
          >
            <div className="jw-affNotificationItem__top">
              <strong>{item.title || title.replace(/s$/, "")}</strong>
              {!item.readAt && (kind === "announcements" || kind === "messages") ? (
                <span className="jw-affNotificationItem__new">New</span>
              ) : null}
            </div>
            {item.body ? <div className="jw-affNotificationItem__body">{item.body.slice(0, 200)}</div> : null}
            {kind === "commission" ? (
              <div className="jw-affNotificationItem__detail">
                <span>Commission: <strong>{formatMoney(item.amount)}</strong></span>
                <StatusBadge status={item.status} />
              </div>
            ) : null}
            {kind === "withdrawal" ? (
              <div className="jw-affNotificationItem__detail">
                <span>Withdrawal: <strong>{formatMoney(item.amount)}</strong></span>
                <StatusBadge status={item.status} />
              </div>
            ) : null}
            {item.sentAt || item.at ? (
              <time className="jw-affNotificationItem__time">
                {String(item.sentAt || item.at).slice(0, 16).replace("T", " ")}
              </time>
            ) : null}
          </div>
        ))}
        </div>
      )}
    </section>
  );
}

export function AffiliateSupportPage() {
  const [contact, setContact] = useState(null);
  const [myMessages, setMyMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    affiliateApi
      .getSupport()
      .then((d) => {
        setContact(d);
        setMyMessages(d.messages || []);
      })
      .catch((e) => setError(e.message));
  }

  useEffect(() => { load(); }, []);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMsg("");
    try {
      const res = await affiliateApi.postSupport({ message });
      setMsg(res.message || "Sent.");
      setMessage("");
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AffiliatePage title="Support" error={error}>
      <div className="jw-affSupport">
        <section className="jw-affSupportContact">
          <div className="jw-affSupportHeading">
            <span className="jw-affSupportHeading__icon">
              <Headphones size={21} aria-hidden="true" />
            </span>
            <div>
              <h2>Contact support</h2>
              <p>Choose a contact method or send us a message.</p>
            </div>
          </div>

          {contact ? (
            <div className="jw-affSupportMethods">
              <ContactMethod
                icon={Send}
                label="Telegram"
                value={contact.contact?.telegram}
                tone="blue"
                href={telegramHref(contact.contact?.telegram)}
              />
              <ContactMethod
                icon={MessageCircle}
                label="WhatsApp"
                value={contact.contact?.whatsapp}
                tone="green"
                href={whatsappHref(contact.contact?.whatsapp)}
              />
              <ContactMethod
                icon={Mail}
                label="Email"
                value={contact.contact?.email}
                tone="purple"
                href={contact.contact?.email ? `mailto:${contact.contact.email}` : null}
              />
            </div>
          ) : (
            <div className="jw-adminSkeleton" style={{ height: 72 }} />
          )}

          {myMessages.length ? (
            <div className="jw-affSupportHistory">
              <h3>Your recent messages</h3>
              {myMessages.map((m) => (
                <div key={m.id} className="jw-affSupportHistoryItem">
                  <div className="jw-affSupportHistoryItem__top">
                    <StatusBadge status={m.status} />
                    <time>{String(m.createdAt || "").slice(0, 16).replace("T", " ")}</time>
                  </div>
                  <div className="jw-affSupportHistoryItem__msg">{m.message}</div>
                  {m.adminReply ? (
                    <div className="jw-affSupportHistoryItem__reply">
                      <strong>Support reply:</strong> {m.adminReply}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <section className="jw-affSupportFormCard">
          <div className="jw-affSupportFormCard__header">
            <h2>Send a message</h2>
            <p>Describe your issue and our team will get back to you.</p>
          </div>
          <form onSubmit={submit}>
            <AdminFilterField label="How can we help?">
              <textarea
                className="jw-adminUsersModal__input jw-affSupportTextarea"
                rows={6}
                maxLength={1000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Please describe your question or issue…"
                required
              />
            </AdminFilterField>
            <div className="jw-affSupportFormCard__footer">
              <span className="jw-affSupportCharacterCount">{message.length}/1000</span>
              <AdminButton type="submit" variant="green" disabled={saving || message.trim().length < 5}>
                <span className="jw-affSupportSubmit">
                  {saving ? "Sending…" : "Submit Message"}
                  {!saving ? <Send size={15} aria-hidden="true" /> : null}
                </span>
              </AdminButton>
            </div>
            {msg ? <div className="jw-affSupportSuccess">{msg}</div> : null}
          </form>
        </section>
      </div>
    </AffiliatePage>
  );
}

function telegramHref(value) {
  if (!value) return null;
  const v = String(value).trim();
  if (/^https?:\/\//i.test(v)) return v;
  if (/^(t\.me\/|telegram\.me\/)/i.test(v)) return `https://${v}`;
  const handle = v.replace(/^@/, "");
  return handle ? `https://t.me/${handle}` : null;
}

function whatsappHref(value) {
  if (!value) return null;
  const v = String(value).trim();
  if (/^https?:\/\//i.test(v)) return v;
  const digits = v.replace(/[^\d]/g, "");
  return digits ? `https://wa.me/${digits}` : null;
}

function ContactMethod({ icon: Icon, label, value, tone, href }) {
  return (
    <div className="jw-affSupportMethod">
      <span className={`jw-affSupportMethod__icon is-${tone}`}>
        <Icon size={18} aria-hidden="true" />
      </span>
      <div className="jw-affSupportMethod__content">
        <span>{label}</span>
        {value && href ? (
          <a href={href} target="_blank" rel="noreferrer">{value}</a>
        ) : (
          <strong className={value ? "" : "is-empty"}>{value || "Not configured"}</strong>
        )}
      </div>
    </div>
  );
}
