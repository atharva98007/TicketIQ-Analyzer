import React, { useState } from 'react';

const TicketAnalyzer = () => {
  // 1. Setup state for the form inputs
  const [ticketId, setTicketId] = useState('TKT-001');
  const [customerName, setCustomerName] = useState('Sarah Connor');
  const [message, setMessage] = useState("I've been trying to access my account for 3 days and I keep getting a 500 error! If I don't get this fixed today I'm canceling my subscription.");
  
  // 2. Setup state for the API response and loading status
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);

  // 3. The function that talks to your Python AI Backend
  const handleAnalyze = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      // Fetching from the FastAPI backend
      const response = await fetch('http://127.0.0.1:8000/api/analyze-ticket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticket_id: ticketId,
          customer_name: customerName,
          message: message,
        }),
      });

      if (!response.ok) {
        throw new Error(`Backend returned an error: ${response.status}`);
      }

      const data = await response.json();
      setAnalysis(data); // Save the AI's response to state
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 4. The UI
  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h2>AI Support Ticket Analyzer</h2>
      
      <form onSubmit={handleAnalyze} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <input 
          type="text" 
          value={ticketId} 
          onChange={(e) => setTicketId(e.target.value)} 
          placeholder="Ticket ID"
          required
        />
        <input 
          type="text" 
          value={customerName} 
          onChange={(e) => setCustomerName(e.target.value)} 
          placeholder="Customer Name"
          required
        />
        <textarea 
          value={message} 
          onChange={(e) => setMessage(e.target.value)} 
          placeholder="Paste the customer's message here..."
          rows="5"
          required
        />
        <button 
          type="submit" 
          disabled={loading}
          style={{ padding: '10px', backgroundColor: loading ? '#ccc' : '#007bff', color: 'white', border: 'none', cursor: 'pointer' }}
        >
          {loading ? 'AI is analyzing...' : 'Analyze with Llama 3.1'}
        </button>
      </form>

      {/* 5. Display the Errors (if any) */}
      {error && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#ffebee', color: '#c62828' }}>
          <strong>Error:</strong> {error}
          <p style={{ fontSize: '14px' }}>Make sure the FastAPI backend is running on http://127.0.0.1:8000!</p>
        </div>
      )}

      {/* 6. Display the AI's Analysis */}
      {analysis && (
        <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#f4f4f9', borderRadius: '8px' }}>
          <h3>Analysis Results:</h3>
          <p><strong>Urgency:</strong> {analysis.urgency}</p>
          <p><strong>Sentiment:</strong> {analysis.sentiment}</p>
          <p><strong>Category:</strong> {analysis.category}</p>
          <p>
            <strong>Needs Escalation:</strong> 
            <span style={{ color: analysis.escalate ? 'red' : 'green', fontWeight: 'bold', marginLeft: '5px' }}>
              {analysis.escalate ? 'YES' : 'NO'}
            </span>
          </p>
          <hr />
          <h4>Suggested AI Response:</h4>
          <p style={{ fontStyle: 'italic', backgroundColor: '#e9ecef', padding: '10px' }}>{analysis.suggested_response}</p>
          <hr />
          <h4>AI Reasoning:</h4>
          <p style={{ fontSize: '14px', color: '#555' }}>{analysis.reasoning}</p>
        </div>
      )}
    </div>
  );
};

export default TicketAnalyzer;