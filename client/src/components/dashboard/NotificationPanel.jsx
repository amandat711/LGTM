import React, { useState, useMemo } from "react";
import { formatDate } from '../calendar/calendarUtils';
import "../../styles/NotificationPanel.css";
// bell icon
import NotificationsIcon from '@mui/icons-material/Notifications';

// testing
// const sampleNotifications = [
//     {
//         id: 1,
//         type: 'cancelled',
//         otherPerson: 'Prof. Smith',
//         dateLabel: 'ONLINE, 2PM',
//         read: false,
//     },
//     {
//         id: 2,
//         type: 'confirmed',
//         otherPerson: 'Jane Doe',
//         dateLabel: 'MCMED 504, 4PM',
//         read: false,
//     },
//     {
//         id: 3,
//         type: 'heatmap',
//         otherPerson: 'Jane Doe',
//         dateLabel: 'MCMED 504, 4PM',
//         read: false,
//     },
//     {
//         id: 4,
//         type: 'confirmed',
//         otherPerson: 'Jane Doe',
//         dateLabel: 'MCMED 504, 4PM',
//         read: false,
//     },
// ];


export default function NotificationPanel({ user, appointments=[] }) {
    console.log('NotificationPanel rendered');

    const [open, setOpen] = useState(false); // dropdown open/closed -> closed on default

    const [readIds, setReadIds] = useState([]); // keeping track of read/unread locally

    // MAPPING FROM UpcomingAppointments
    const notifications = useMemo(() => {
        return appointments
            .filter((appt) => appt.status !== 'completed')
            .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
            .slice(0, 10)
            .map((appt) => ({
                id: appt.id,
                type: appt.status,
                otherPerson: appt.ownerName,
                dateLabel: `${formatDate(appt.startTime)} • ${appt.location}`,
                read: readIds.includes(appt.id),
            }));
    }, [appointments, readIds]);

    const unreadCount = notifications.filter((n) => !n.read).length; // get unread notif count

    // dropdown panel
    const togglePanel = () => {
        setOpen((prev) => !prev);
    };

    // mark singular notif as read
    // we dont want mark all as real :(
    const markAsRead = (id) => {
        if (!readIds.includes(id)) {
        setReadIds((prev) => [...prev, id]);
        }
    };


    // notification type
    const getNotificationMessage = (notification) => {
        switch (notification.type) {
            case 'cancelled':
                return `Your appointment with ${notification.otherPerson} has been cancelled.`;
            case 'confirmed':
                return `Your appointment with ${notification.otherPerson} has been confirmed.`;
            case 'pending':
                return `Your appointment with ${notification.otherPerson} is pending.`;
            case 'rescheduled':
                return `Your appointment with ${notification.otherPerson} has been rescheduled.`;
            case 'heatmap':
                return `You have a heatmap awaiting.`;
            default:
                return `Appointment update with ${notification.otherPerson}.`;
        }
    };

    // return (
    //     <div style={{ background: 'yellow', padding: '10px', color: 'black' }}>
    //         TEST NOTIF
    //     </div>
    // );

    return (
        <div className="notif-wrapper">
            <button className="notif-button" onClick={togglePanel} aria-label="Notifications">
                <NotificationsIcon className="notif-icon" />
                {unreadCount > 0 && (<span className="notif-badge">{unreadCount}</span>)}  {/*show badge if there are unread notifications*/}
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
                                    className={`notif-item notif-${notification.type} ${notification.read ? '' : 'unread'}`}
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