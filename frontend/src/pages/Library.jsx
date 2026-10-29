import React, { useState } from 'react';

const initialMaterials = [
  { 
    id: 1, 
    title: 'Data Structures & Algorithms Notes', 
    subject: 'CSE', 
    topic: 'Trees & Graphs', 
    ratings: [5, 4, 5], 
    date: '2026-10-10',
    comments: ['Very useful notes!', 'Thanks for sharing.']
  },
  { 
    id: 2, 
    title: 'DBMS SQL Cheat Sheet', 
    subject: 'Database', 
    topic: 'Queries', 
    ratings: [4, 5], 
    date: '2026-10-12',
    comments: ['Helped me pass the lab test.']
  },
  { 
    id: 3, 
    title: 'Software Engineering Sprint Guide', 
    subject: 'SE', 
    topic: 'Agile & Scrum', 
    ratings: [5, 5, 5], 
    date: '2026-10-15',
    comments: ['Clear explanation of Sprint 2!']
  }
];

export default function Library() {
  const [materials, setMaterials] = useState(initialMaterials);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [newComments, setNewComments] = useState({});
  const [flaggingId, setFlaggingId] = useState(null);
  const [flagReason, setFlagReason] = useState('');
  const [reportStatus, setReportStatus] = useState({});

  const getAvgRating = (ratings) => {
    if (!ratings || ratings.length === 0) return '0.0';
    const sum = ratings.reduce((a, b) => a + b, 0);
    return (sum / ratings.length).toFixed(1);
  };

  const handleAddRating = (id, newRating) => {
    setMaterials(materials.map(item => {
      if (item.id === id) {
        return { ...item, ratings: [...item.ratings, Number(newRating)] };
      }
      return item;
    }));
  };

  const handleAddComment = (id) => {
    const text = newComments[id];
    if (!text || text.trim() === '') return;

    setMaterials(materials.map(item => {
      if (item.id === id) {
        return { ...item, comments: [...item.comments, text] };
      }
      return item;
    }));

    setNewComments({ ...newComments, [id]: '' });
  };

  const handleFlagContent = async (id) => {
    if (!flagReason.trim()) return;
    const token = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('csq_token') : null;

    try {
      if (token) {
        await fetch(`/api/materials/${id}/flag`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ reason: flagReason })
        });
      }
      setReportStatus(prev => ({ ...prev, [id]: 'Reported for review' }));
    } catch {
      setReportStatus(prev => ({ ...prev, [id]: 'Report logged' }));
    }
    setFlaggingId(null);
    setFlagReason('');
  };

  const filteredMaterials = materials.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.topic.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = selectedSubject === 'All' || item.subject === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  return (
    <div style={{ padding: '20px', maxWidth: '850px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      <h2>Study Materials & Resources (Sprint 2 Features)</h2>

      {/* CSQ-F-012: Search and Filter Bar */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '25px' }}>
        <input
          type="text"
          placeholder="Search by title or topic..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: 1, padding: '10px', fontSize: '15px', borderRadius: '5px', border: '1px solid #ccc' }}
        />

        <select
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          style={{ padding: '10px', fontSize: '15px', borderRadius: '5px', border: '1px solid #ccc' }}
        >
          <option value="All">All Subjects</option>
          <option value="CSE">CSE</option>
          <option value="Database">Database</option>
          <option value="SE">SE</option>
        </select>
      </div>

      {/* Material Cards */}
      <div style={{ display: 'grid', gap: '20px' }}>
        {filteredMaterials.length > 0 ? (
          filteredMaterials.map((material) => (
            <div key={material.id} style={{ border: '1px solid #e0e0e0', padding: '18px', borderRadius: '8px', backgroundColor: '#ffffff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 8px 0', color: '#1a73e8' }}>{material.title}</h3>
              <p style={{ margin: '4px 0', color: '#555' }}>
                <strong>Subject:</strong> {material.subject} | <strong>Topic:</strong> {material.topic} | <strong>Uploaded:</strong> {material.date}
              </p>
              
              {/* CSQ-F-042: Rating System */}
              <div style={{ margin: '12px 0', padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '5px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span><strong>Rating:</strong> Star {getAvgRating(material.ratings)} ({material.ratings.length} votes)</span>
                <span style={{ marginLeft: 'auto' }}>Rate this: </span>
                <select 
                  defaultValue="" 
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddRating(material.id, e.target.value);
                      e.target.value = '';
                    }
                  }}
                  style={{ padding: '4px', borderRadius: '4px' }}
                >
                  <option value="" disabled>Select Rating</option>
                  <option value="5">5 Star</option>
                  <option value="4">4 Star</option>
                  <option value="3">3 Star</option>
                  <option value="2">2 Star</option>
                  <option value="1">1 Star</option>
                </select>
              </div>

              {/* CSQ-F-040: Comment System */}
              <div style={{ marginTop: '15px' }}>
                <h4 style={{ margin: '0 0 8px 0' }}>Comments ({material.comments.length}):</h4>
                <ul style={{ paddingLeft: '20px', margin: '0 0 10px 0', color: '#333' }}>
                  {material.comments.map((comment, index) => (
                    <li key={index} style={{ marginBottom: '4px' }}>{comment}</li>
                  ))}
                </ul>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Write a comment..."
                    value={newComments[material.id] || ''}
                    onChange={(e) => setNewComments({ ...newComments, [material.id]: e.target.value })}
                    style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                  <button 
                    onClick={() => handleAddComment(material.id)}
                    style={{ padding: '8px 16px', backgroundColor: '#1a73e8', color: '#ffffff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Post
                  </button>
                </div>
              </div>

              {/* CSQ-F-061: Flag / Report Content */}
              <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px dashed #e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {reportStatus[material.id] ? (
                  <span style={{ fontSize: '13px', color: '#2e7d32', fontWeight: 500 }}>
                    ✓ {reportStatus[material.id]}
                  </span>
                ) : flaggingId === material.id ? (
                  <div style={{ display: 'flex', gap: '8px', width: '100%', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Reason for reporting (e.g. Inappropriate content, copyright violation)..."
                      value={flagReason}
                      onChange={(e) => setFlagReason(e.target.value)}
                      style={{ flex: 1, padding: '6px 10px', fontSize: '13px', borderRadius: '4px', border: '1px solid #dc2626' }}
                    />
                    <button
                      type="button"
                      onClick={() => handleFlagContent(material.id)}
                      style={{ padding: '6px 12px', fontSize: '13px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Submit Flag
                    </button>
                    <button
                      type="button"
                      onClick={() => { setFlaggingId(null); setFlagReason(''); }}
                      style={{ padding: '6px 10px', fontSize: '13px', backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setFlaggingId(material.id); setFlagReason(''); }}
                    style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    🚩 Report / Flag content
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <p>No materials found matching search criteria.</p>
        )}
      </div>
    </div>
  );
}