import React, { useState } from 'react';

// Admin console for the moderation features:
//   CSQ-F-060 (users), CSQ-F-062 / CSQ-F-011 (content review), CSQ-SR-005 (audit log).
// It uses the login token that the Login page keeps in sessionStorage.

const TOKEN_KEY = 'csq_token';

function readToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

async function callApi(method, path, body) {
  const token = readToken();
  if (!token) {
    return { ok: false, status: 401, data: { error: 'Log in as an administrator first.' } };
  }
  try {
    const response = await fetch(path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: 'Cannot reach the server. Is the backend running?' } };
  }
}

const boxStyle = { padding: '20px', border: '1px solid #ccc', margin: '10px 0', borderRadius: '8px' };
const cell = { textAlign: 'left', padding: '6px 10px', borderBottom: '1px solid #ddd' };
const smallButton = { marginRight: '6px' };

const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [queue, setQueue] = useState([]);
  const [auditEntries, setAuditEntries] = useState([]);
  const [chainStatus, setChainStatus] = useState(null);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState(null); // { type: 'ok' | 'error', text }
  const [busy, setBusy] = useState(false);

  const fail = (data, status) => {
    if (status === 401) setMessage({ type: 'error', text: 'Log in as an administrator first.' });
    else if (status === 403) setMessage({ type: 'error', text: 'Only administrators can use this panel.' });
    else setMessage({ type: 'error', text: data.error || 'Request failed' });
  };

  const loadAll = async (announce = true) => {
    setBusy(true);
    const [u, q, a] = await Promise.all([
      callApi('GET', '/api/admin/users'),
      callApi('GET', '/api/admin/materials/review-queue'),
      callApi('GET', '/api/admin/audit-log'),
    ]);
    if (!u.ok) {
      fail(u.data, u.status);
    } else {
      setUsers(u.data.users);
      setQueue(q.ok ? q.data.items : []);
      setAuditEntries(a.ok ? [...a.data.entries].reverse().slice(0, 15) : []);
      if (announce) setMessage({ type: 'ok', text: 'Admin data loaded.' });
    }
    setBusy(false);
  };

  // Runs an admin action that needs a reason, then reloads the lists.
  const act = async (path, successText) => {
    if (!reason.trim()) {
      setMessage({ type: 'error', text: 'Type a reason first. Every admin action is audit-logged with it.' });
      return;
    }
    setBusy(true);
    const result = await callApi('POST', path, { reason });
    if (result.ok) {
      setReason('');
      await loadAll(false);
      setMessage({ type: 'ok', text: successText });
    } else {
      fail(result.data, result.status);
    }
    setBusy(false);
  };

  const verifyChain = async () => {
    const result = await callApi('GET', '/api/admin/audit-log/verify');
    if (result.ok) setChainStatus(result.data);
    else fail(result.data, result.status);
  };

  return (
    <div style={boxStyle}>
      <h2>Admin Console</h2>
      <p>Log in as an administrator above, then press Load.</p>

      <div style={{ marginBottom: '12px' }}>
        <button type="button" onClick={() => loadAll()} disabled={busy}>
          {busy ? 'Working...' : 'Load / Refresh'}
        </button>{' '}
        <label htmlFor="admin-reason">Reason for the next action: </label>
        <input
          id="admin-reason"
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Repeated spam"
          style={{ width: '280px' }}
        />
      </div>

      {message && (
        <p role={message.type === 'error' ? 'alert' : 'status'} style={{ color: message.type === 'error' ? 'crimson' : 'green' }}>
          {message.text}
        </p>
      )}

      <h3>Users</h3>
      {users.length === 0 ? (
        <p>No users loaded.</p>
      ) : (
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <caption style={{ textAlign: 'left' }}>Registered users</caption>
          <thead>
            <tr>
              <th style={cell}>Email</th>
              <th style={cell}>Role</th>
              <th style={cell}>Status</th>
              <th style={cell}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td style={cell}>{user.email}</td>
                <td style={cell}>{user.role}</td>
                <td style={cell}>{user.status}</td>
                <td style={cell}>
                  {user.role === 'admin' ? (
                    '-'
                  ) : user.status === 'active' ? (
                    <>
                      <button type="button" style={smallButton} disabled={busy}
                        onClick={() => act(`/api/admin/users/${user.id}/suspend`, `${user.email} suspended.`)}>
                        Suspend
                      </button>
                      <button type="button" style={smallButton} disabled={busy}
                        onClick={() => act(`/api/admin/users/${user.id}/warn`, `Warning sent to ${user.email}.`)}>
                        Warn
                      </button>
                    </>
                  ) : (
                    <button type="button" style={smallButton} disabled={busy}
                      onClick={() => act(`/api/admin/users/${user.id}/reactivate`, `${user.email} reactivated.`)}>
                      Reactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3>Content review queue</h3>
      {queue.length === 0 ? (
        <p>Nothing is waiting for review.</p>
      ) : (
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <caption style={{ textAlign: 'left' }}>Material held by the plagiarism check</caption>
          <thead>
            <tr>
              <th style={cell}>Title</th>
              <th style={cell}>Source</th>
              <th style={cell}>Reason</th>
              <th style={cell}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {queue.map((item) => (
              <tr key={`${item.materialId}-${item.source}`}>
                <td style={cell}>{item.title}</td>
                <td style={cell}>{item.source}</td>
                <td style={cell}>{item.reason}</td>
                <td style={cell}>
                  <button type="button" style={smallButton} disabled={busy}
                    onClick={() => act(`/api/admin/materials/${item.materialId}/approve`, `${item.title} published.`)}>
                    Approve
                  </button>
                  <button type="button" style={smallButton} disabled={busy}
                    onClick={() => act(`/api/admin/materials/${item.materialId}/remove`, `${item.title} removed.`)}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3>Audit log</h3>
      <button type="button" onClick={verifyChain}>Verify log integrity</button>
      {chainStatus && (
        <span role="status" style={{ marginLeft: '10px', color: chainStatus.valid ? 'green' : 'crimson' }}>
          {chainStatus.valid
            ? `Log is intact (${chainStatus.count} entries).`
            : `Log was tampered with at entry ${chainStatus.brokenAtSeq}.`}
        </span>
      )}
      {auditEntries.length === 0 ? (
        <p>No audit entries yet.</p>
      ) : (
        <table style={{ borderCollapse: 'collapse', width: '100%', marginTop: '10px' }}>
          <caption style={{ textAlign: 'left' }}>Latest entries, newest first</caption>
          <thead>
            <tr>
              <th style={cell}>#</th>
              <th style={cell}>Time</th>
              <th style={cell}>Actor</th>
              <th style={cell}>Action</th>
              <th style={cell}>Target</th>
              <th style={cell}>Reason</th>
            </tr>
          </thead>
          <tbody>
            {auditEntries.map((entry) => (
              <tr key={entry.seq}>
                <td style={cell}>{entry.seq}</td>
                <td style={cell}>{new Date(entry.timestamp).toLocaleString()}</td>
                <td style={cell}>{entry.actor.email || entry.actor.id}</td>
                <td style={cell}>{entry.action}</td>
                <td style={cell}>{entry.target}</td>
                <td style={cell}>{entry.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminPanel;
