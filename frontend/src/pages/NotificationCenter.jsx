import React, { useState } from 'react';

const sampleNotifications = [
  {
    id: 'notif-1',
    type: 'new_material',
    title: 'New Material: Software Engineering Sprint Guide',
    message: 'New study material in Agile & Scrum is now available.',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    read: false,
  },
  {
    id: 'notif-2',
    type: 'quiz_deadline',
    title: 'Upcoming Quiz Deadline: Unit 2 Sprint Quiz',
    message: 'Reminder: Deadline closes in 24 hours.',
    timestamp: '2 hours ago',
    read: false,
  },
  {
    id: 'notif-3',
    type: 'grade_published',
    title: 'Quiz Results: Software Engineering Fundamentals',
    message: 'Your score has been published: 2/2 (100%).',
    timestamp: 'Yesterday',
    read: true,
  },
];

export default function NotificationCenter({ notifications: propNotifs }) {
  const [items, setItems] = useState(propNotifs || sampleNotifications);
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = items.filter((n) => !n.read).length;

  const handleMarkRead = (id) => {
    setItems(items.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const handleMarkAllRead = () => {
    setItems(items.map((n) => ({ ...n, read: true })));
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'new_material':
        return '#3498db';
      case 'quiz_deadline':
        return '#e67e22';
      case 'grade_published':
        return '#27ae60';
      default:
        return '#7f8c8d';
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: '#fff',
          border: '1px solid #ccc',
          borderRadius: '50px',
          padding: '8px 16px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontWeight: 'bold',
          fontSize: '13px',
        }}
      >
        <span>Notifications</span>
        {unreadCount > 0 && (
          <span
            style={{
              background: '#e74c3c',
              color: '#fff',
              borderRadius: '10px',
              padding: '2px 7px',
              fontSize: '11px',
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '40px',
            width: '360px',
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              background: '#f8f9fa',
              borderBottom: '1px solid #eee',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h4 style={{ margin: 0, fontSize: '14px' }}>Notifications (CSQ-F-052)</h4>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2980b9',
                  fontSize: '11px',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
            {items.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#999', fontSize: '13px' }}>
                No notifications
              </div>
            ) : (
              items.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleMarkRead(n.id)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #f0f0f0',
                    background: n.read ? '#fff' : '#f9fbfe',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        color: '#fff',
                        background: getTypeColor(n.type),
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                      }}
                    >
                      {n.type.replace('_', ' ')}
                    </span>
                    <span style={{ fontSize: '11px', color: '#999' }}>{n.timestamp}</span>
                  </div>
                  <div style={{ fontWeight: n.read ? 'normal' : 'bold', fontSize: '13px', color: '#2c3e50' }}>
                    {n.title}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>{n.message}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
