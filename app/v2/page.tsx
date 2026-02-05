/**
 * EVOX Dashboard v0.2 - Server-side rendered
 * With AgentCommsWidget showing keywords
 */

interface Agent {
  name: string;
  status?: string;
}

interface Activity {
  _id: string;
  agentName?: string;
  eventType?: string;
  description?: string;
  title?: string;
  timestamp: number;
}

// Keywords extraction
const PRIORITY_KEYWORDS = [
  "shipped", "completed", "done", "fixed", "merged", "deployed", "created",
  "blocked", "waiting", "testing", "working",
];

const NOISE_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "have", "has",
  "do", "does", "did", "will", "would", "could", "should", "to", "of", "in",
  "for", "on", "with", "at", "by", "from", "and", "or", "but", "this", "that",
]);

function extractKeywords(text: string): string[] {
  if (!text) return [];
  const keywords: string[] = [];
  const textLower = text.toLowerCase();

  // Extract AGT-XXX tickets
  const tickets = text.match(/AGT-\d+/gi) || [];
  keywords.push(...tickets.slice(0, 2));

  // Extract priority keywords
  for (const kw of PRIORITY_KEYWORDS) {
    if (keywords.length >= 5) break;
    if (textLower.includes(kw) && !keywords.includes(kw)) {
      keywords.push(kw);
    }
  }

  // Add significant words
  if (keywords.length < 5) {
    const words = text.split(/\s+/).filter(w => 
      w.length > 4 && !NOISE_WORDS.has(w.toLowerCase()) && !w.match(/^[^\w]/)
    );
    for (const w of words.slice(0, 3)) {
      if (keywords.length >= 5) break;
      if (!keywords.some(k => k.toLowerCase() === w.toLowerCase())) {
        keywords.push(w.replace(/[^\w-]/g, ''));
      }
    }
  }

  return keywords.slice(0, 5);
}

function formatTime(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h`;
}

async function getData() {
  const res = await fetch("https://gregarious-elk-556.convex.site/status", {
    cache: 'no-store'
  });
  return res.json();
}

export default async function V2Dashboard() {
  const data = await getData();
  
  const agents: Agent[] = data.agents || [];
  const activities: Activity[] = data.recentActivity || [];
  const online = agents.filter((a) => a.status === 'busy').length;
  const channelMsgs = activities.filter((a) => a.eventType === 'channel_message');

  return (
    <div style={{background: '#000', color: '#fff', minHeight: '100vh', padding: 16, fontFamily: 'system-ui', maxWidth: 480, margin: '0 auto'}}>
      {/* Header */}
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid #222'}}>
        <div>
          <h1 style={{fontSize: 24, fontWeight: 'bold', margin: 0}}>EVOX</h1>
          <span style={{fontSize: 10, color: '#666'}}>v0.2</span>
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: 6, background: '#111', padding: '6px 12px', borderRadius: 20}}>
          <div style={{width: 8, height: 8, borderRadius: '50%', background: '#22c55e'}} />
          <span style={{fontSize: 11, color: '#888'}}>Live</span>
        </div>
      </div>

      {/* Agent Status */}
      <div style={{marginBottom: 20}}>
        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 10}}>
          <span style={{fontSize: 13, color: '#888'}}>Team Status</span>
          <span style={{fontSize: 11, color: '#666', background: '#111', padding: '2px 8px', borderRadius: 4}}>{online}/{agents.length}</span>
        </div>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8}}>
          {agents.slice(0, 6).map((a, i) => (
            <div key={i} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: 10, background: '#111', borderRadius: 8}}>
              <div style={{width: 14, height: 14, borderRadius: '50%', background: a.status === 'busy' ? '#22c55e' : '#ef4444'}} />
              <span style={{fontSize: 10, color: '#ccc'}}>{a.name?.slice(0, 4)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Metrics */}
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20}}>
        <div style={{background: '#111', padding: 16, borderRadius: 12, textAlign: 'center'}}>
          <div style={{fontSize: 28, fontWeight: 'bold', color: '#22c55e'}}>{online}</div>
          <div style={{fontSize: 11, color: '#666', textTransform: 'uppercase'}}>Online</div>
        </div>
        <div style={{background: '#111', padding: 16, borderRadius: 12, textAlign: 'center'}}>
          <div style={{fontSize: 28, fontWeight: 'bold', color: '#3b82f6'}}>{channelMsgs.length}</div>
          <div style={{fontSize: 11, color: '#666', textTransform: 'uppercase'}}>Messages</div>
        </div>
      </div>

      {/* Agent Comms Widget - 3-5 Keywords */}
      <div style={{background: '#111', borderRadius: 12, padding: 16, marginBottom: 20}}>
        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 12}}>
          <span style={{fontSize: 13, color: '#888'}}>🗣️ Agent Comms</span>
          <span style={{fontSize: 10, color: '#555'}}>{channelMsgs.length} msgs</span>
        </div>
        <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
          {channelMsgs.slice(0, 6).map((msg, i) => {
            const keywords = extractKeywords(msg.description || '');
            const channel = msg.title?.match(/#(\w+)/)?.[1] || 'dev';
            return (
              <div key={i} style={{paddingBottom: 8, borderBottom: i < 5 ? '1px solid #222' : 'none'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4, fontSize: 11}}>
                  <span style={{color: '#3b82f6', fontWeight: 600}}>{(msg.agentName || '?').toUpperCase()}</span>
                  <span style={{color: '#444'}}>→</span>
                  <span style={{color: '#888'}}>#{channel}</span>
                  <span style={{color: '#333', marginLeft: 'auto'}}>{formatTime(msg.timestamp)}</span>
                </div>
                <div style={{display: 'flex', flexWrap: 'wrap', gap: 4}}>
                  {keywords.map((kw, j) => (
                    <span key={j} style={{
                      fontSize: 10,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: kw.match(/AGT-\d+/i) ? '#581c87' : 
                                  kw.match(/shipped|done|completed|merged/i) ? '#14532d' :
                                  kw.match(/blocked|waiting/i) ? '#7f1d1d' : '#222',
                      color: kw.match(/AGT-\d+/i) ? '#c084fc' :
                             kw.match(/shipped|done|completed|merged/i) ? '#4ade80' :
                             kw.match(/blocked|waiting/i) ? '#f87171' : '#888'
                    }}>{kw}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Activity Feed */}
      <div>
        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 10}}>
          <span style={{fontSize: 13, color: '#888'}}>Live Activity</span>
          <span style={{fontSize: 10, color: '#555'}}>{activities.length} events</span>
        </div>
        <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
          {activities.slice(0, 5).map((a, i) => (
            <div key={i} style={{background: '#111', padding: 12, borderRadius: 8}}>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 4}}>
                <span style={{color: '#3b82f6', fontWeight: 500, fontSize: 13}}>{a.agentName || 'System'}</span>
                <span style={{color: '#555', fontSize: 11}}>{formatTime(a.timestamp)}</span>
              </div>
              <div style={{color: '#999', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                {(a.description || a.title || 'Activity').slice(0, 70)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{marginTop: 20, paddingTop: 12, borderTop: '1px solid #222', textAlign: 'center'}}>
        <span style={{fontSize: 10, color: '#333'}}>↻ Pull to refresh</span>
      </div>
    </div>
  );
}
