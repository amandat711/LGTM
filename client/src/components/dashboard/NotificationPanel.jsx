import React, { useState, useMemo } from "react";
import { formatDate } from "../calendar/calendarUtils";
import "../../styles/NotificationPanel.css";
import NotificationsIcon from "@mui/icons-material/Notifications";


export default function NotificationPanel({
    user,
    appointments = [],
    role = "student",
    }) {
    const [open, setOpen] = useState(false);
    const [readIds, setReadIds] = useState([]);

    const notifications = useMemo(() => {
    if (role === "professor") {
        return appointments.flatMap((appt) => {
        const apptId = appt.appointment_id ?? appt.id;
        const startIso = appt.start_time ?? appt.startTime;
        return (appt.participants || [])
            .filter((p) => p.participant_role === "attendee")
            .filter(
            (p) =>
                p.participant_status === "confirmed" ||
                p.participant_status === "cancelled"
            )
            .map((p) => {
            const pid = p.user_id ?? p.userId;
            const notifId = `${apptId}-${pid}-${p.participant_status}`;

            return {
                id: notifId,
                type: p.participant_status, // ← IMPORTANT
                otherPerson: `${p.first_name} ${p.last_name}`.trim(),
                dateLabel: `${formatDate(startIso)} • ${appt.location || "TBD"}`,
                read: readIds.includes(notifId),
            };
            });
        }).slice(0, 10);
    }

        return appointments
            .filter((appt) => appt.status !== "completed")
            .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
            .slice(0, 10)
            .map((appt) => ({
                id: appt.id,
                type: appt.status,
                otherPerson: appt.ownerName,
                dateLabel: `${formatDate(appt.startTime)} • ${appt.location}`,
                read: readIds.includes(appt.id),
            }));
    }, [appointments, readIds, role]);

    const unreadCount = notifications.filter((n) => !n.read).length;

    const togglePanel = () => {
        setOpen((prev) => !prev);
    };

    const markAsRead = (id) => {
        if (!readIds.includes(id)) {
        setReadIds((prev) => [...prev, id]);
        }
    };

    const getNotificationMessage = (notification) => {
        if (role === "professor") {
        switch (notification.type) {
            case "confirmed":
            return `${notification.otherPerson} has accepted the event.`;
            case "cancelled":
            return `${notification.otherPerson} has declined the event.`;
            case "pending":
            return `${notification.otherPerson} has not responded to the event yet.`;
            default:
            return `Appointment update from ${notification.otherPerson}.`;
        }
        }

        switch (notification.type) {
        case "cancelled":
            return `Your appointment with ${notification.otherPerson} has been cancelled.`;
        case "confirmed":
            return `Your appointment with ${notification.otherPerson} has been confirmed.`;
        case "pending":
            return `Your appointment with ${notification.otherPerson} is pending.`;
        case "rescheduled":
            return `Your appointment with ${notification.otherPerson} has been rescheduled.`;
        case "heatmap":
            return `You have a heatmap awaiting.`;
        default:
            return `Appointment update with ${notification.otherPerson}.`;
        }
    };

    return (
        <div className="notif-wrapper">
        <button
            className="notif-button"
            onClick={togglePanel}
            aria-label="Notifications"
        >
            <NotificationsIcon className="notif-icon" />
            {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
        </button>

        {open && (
            <div className="notif-dropdown">
            <div className="notif-header">
                <span className="notif-title">Notifications</span>
            </div>

            <div className="notif-list">
                {notifications.length === 0 ? (
                <div className="notif-empty">No notifications.</div>
                ) : (
                notifications.map((notification) => (
                    <div
                    key={notification.id}
                    className={`notif-item notif-${notification.type} ${
                        notification.read ? "" : "unread"
                    }`}
                    onClick={() => markAsRead(notification.id)}
                    >
                    <div className="notif-message">
                        {getNotificationMessage(notification)}
                    </div>

                    <div className="notif-details">
                        {notification.dateLabel}
                    </div>
                    </div>
                ))
                )}
            </div>
            </div>
        )}
        </div>
    );
}