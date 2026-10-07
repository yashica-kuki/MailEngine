import React, { useState, useEffect } from 'react';

export default function TicketDetailView({ ticketId }) {
  const [ticket, setTicket] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (ticketId) {
      fetchTicketDetails();
    }
  }, [ticketId]);

  const fetchTicketDetails = async () => {
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/mail/ticket/${ticketId}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        }
      });
      const data = await res.json();

      if (data.success) {
        setTicket(data.ticket);

        // Pre-fill reply text box with AI-generated draft placeholder if available
        const draft = data.ticket.mails.find(
          (m) => m.email_type === 'approved-draft-placeholder'
        );
        if (draft) {
          setReplyText(draft.content);
        } else {
          setReplyText('');
        }
      } else {
        setError(data.message || 'Failed to fetch ticket details.');
      }
    } catch (err) {
      console.error('Fetch Ticket Error:', err);
      setError('Unable to connect to the backend server.');
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim()) {
      alert('Please enter a response before sending.');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');

      // Send payload matching backend /approve-ticket constraints
      const res = await fetch('http://localhost:5000/mail/approve-ticket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          tickId: ticketId,
          recipientEmail: ticket.sender_email,
          replyBodyContent: replyText,
          nextStatus: 'RESOLVED' // allowed: 'PENDING_CUSTOMER' | 'RESOLVED' | 'CLOSED' | 'IN_PROGRESS'
        })
      });

      const data = await res.json();

      if (data.success) {
        alert('Reply dispatched and ticket resolved successfully!');
        fetchTicketDetails(); // Refresh thread to show sent reply
      } else {
        alert('Failed: ' + (data.message || 'Error processing ticket reply.'));
      }
    } catch (err) {
      console.error('Approve Ticket Error:', err);
      alert('An error occurred while dispatching the reply.');
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return <div style={{ color: 'red', padding: '20px' }}>Error: {error}</div>;
  }

  if (!ticket) {
    return <div style={{ padding: '20px' }}>Loading conversation thread...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      {/* Header Info */}
      <div style={{ borderBottom: '1px solid #eaeaea', paddingBottom: '12px', marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 8px 0' }}>{ticket.subject}</h2>
        <div style={{ color: '#555', fontSize: '14px' }}>
          <span><strong>Ticket ID:</strong> #{ticket.tick_id.substring(0, 8)}</span>
          <span style={{ margin: '0 10px' }}>|</span>
          <span><strong>Sender:</strong> {ticket.sender_email}</span>
          <span style={{ margin: '0 10px' }}>|</span>
          <span><strong>Priority:</strong> <span style={{ color: ticket.priority === 'URGENT' || ticket.priority === 'HIGH' ? 'red' : 'green' }}>{ticket.priority}</span></span>
          <span style={{ margin: '0 10px' }}>|</span>
          <span><strong>Status:</strong> {ticket.status}</span>
        </div>
      </div>

      {/* Conversation Thread */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        {ticket.mails
          .filter((m) => m.email_type !== 'approved-draft-placeholder')
          .map((mail) => {
            const isIncoming = mail.direction === 'INCOMING';
            return (
              <div
                key={mail.mail_id || mail.id}
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  alignSelf: isIncoming ? 'flex-start' : 'flex-end',
                  backgroundColor: isIncoming ? '#f4f4f5' : '#e0f2fe',
                  border: isIncoming ? '1px solid #e4e4e7' : '1px solid #bae6fd',
                  maxWidth: '80%'
                }}
              >
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                  <strong>{isIncoming ? mail.sender_email : 'Support Agent'}</strong> •{' '}
                  {mail.sent_at ? new Date(mail.sent_at).toLocaleString() : 'Just now'}
                </div>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                  {mail.content}
                </p>
              </div>
            );
          })}
      </div>

      {/* Reply Action Box */}
      {ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED' ? (
        <div style={{ borderTop: '1px solid #eaeaea', paddingTop: '16px' }}>
          <h4 style={{ margin: '0 0 8px 0' }}>Agent Reply (AI Suggested Draft)</h4>
          <textarea
            rows={6}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '6px',
              border: '1px solid #ccc',
              fontFamily: 'inherit',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Type your response here..."
          />
          <button
            onClick={handleSendReply}
            disabled={loading}
            style={{
              marginTop: '12px',
              padding: '10px 20px',
              backgroundColor: loading ? '#93c5fd' : '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold'
            }}
          >
            {loading ? 'Dispatching Email...' : 'Approve & Send Reply'}
          </button>
        </div>
      ) : (
        <div style={{ padding: '12px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', color: '#166534' }}>
          This ticket has been resolved.
        </div>
      )}
    </div>
  );
}