// scripts/seed.js
// Run: node scripts/seed.js
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || './talaash.db';
const db = new Database(path.resolve(DB_PATH));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, phone TEXT, role TEXT NOT NULL DEFAULT 'user',
    created_at TEXT NOT NULL DEFAULT (datetime('now')), is_active INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY, case_number TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
    age INTEGER NOT NULL, gender TEXT NOT NULL, last_seen TEXT NOT NULL,
    location TEXT NOT NULL, state TEXT NOT NULL, description TEXT NOT NULL,
    physical_desc TEXT NOT NULL, identifying_marks TEXT, age_progression TEXT,
    report_type TEXT NOT NULL DEFAULT 'adult', status TEXT NOT NULL DEFAULT 'pending',
    reporter_id TEXT NOT NULL, contact_name TEXT NOT NULL, contact_phone TEXT NOT NULL,
    contact_relation TEXT NOT NULL, admin_notes TEXT, verified_by TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY, report_id TEXT NOT NULL, filename TEXT NOT NULL,
    data TEXT NOT NULL, uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS sightings (
    id TEXT PRIMARY KEY, report_id TEXT NOT NULL, reporter_name TEXT,
    description TEXT NOT NULL, lat REAL, lng REAL, accuracy REAL,
    timestamp TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY, report_id TEXT NOT NULL, action TEXT NOT NULL,
    user_id TEXT, notes TEXT, timestamp TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Check if already seeded
const existing = db.prepare('SELECT COUNT(*) as cnt FROM users').get();
if (existing.cnt > 0) {
  console.log('✓ Database already seeded. Skipping.');
  process.exit(0);
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

// Seed users
const adminHash = bcrypt.hashSync('admin123', 12);
const userHash = bcrypt.hashSync('user123', 12);

const users = [
  { id: 'u001', name: 'Admin User',   email: 'admin@talaash.in',    hash: adminHash, phone: '+91-9000000000', role: 'admin' },
  { id: 'u002', name: 'Rahul Gupta',  email: 'rahul@example.com',   hash: userHash,  phone: '+91-9111111111', role: 'user'  },
  { id: 'u003', name: 'Priya Nair',   email: 'priya@example.com',   hash: userHash,  phone: '+91-9222222222', role: 'user'  },
];

const insertUser = db.prepare('INSERT INTO users (id,name,email,password_hash,phone,role) VALUES (?,?,?,?,?,?)');
for (const u of users) insertUser.run(u.id, u.name, u.email, u.hash, u.phone, u.role);
console.log(`✓ Seeded ${users.length} users`);

// Seed reports
const reports = [
  {
    id:'r001', cn:'TLS-2025-0011', name:'Priya Sharma', age:28, gender:'Female',
    last_seen:'2025-11-12', location:'Connaught Place, New Delhi', state:'Delhi',
    desc:'Last seen near the metro station wearing a blue saree. She was visiting her cousin and never arrived. Speaks Hindi and Punjabi. Has a scar on her left palm.',
    phys:"Height 5'4\", ~55kg, dark complexion, long black hair, brown eyes",
    marks:'Scar on left palm, small mole on left cheek', type:'adult', status:'missing',
    cname:'Rakesh Sharma', cphone:'+91-9876543210', crel:'Father',
    reporter:'u002', notes:'', lat:28.6315, lng:77.2167
  },
  {
    id:'r002', cn:'TLS-2025-0022', name:'Arjun Kumar', age:15, gender:'Male',
    last_seen:'2025-12-01', location:'Dharavi, Mumbai', state:'Maharashtra',
    desc:'Student went missing after school. Was wearing grey school shirt and navy trousers. Last seen with a group of friends near the main road.',
    phys:"Height 5'2\", slim build, short black hair, sharp nose, wears spectacles",
    marks:'Birthmark on right shoulder', type:'child', status:'missing',
    cname:'Sunita Kumar', cphone:'+91-9123456789', crel:'Mother',
    reporter:'u002', notes:'Coordination with Mumbai Police initiated. Case No: MB/25/8847',
    lat:19.0456, lng:72.8572
  },
  {
    id:'r003', cn:'TLS-2026-0013', name:'Meena Devi', age:65, gender:'Female',
    last_seen:'2026-01-08', location:'Dashashwamedh Ghat, Varanasi', state:'Uttar Pradesh',
    desc:'Elderly woman with mild memory loss. Was visiting the ghats for morning puja and got separated from family in the crowd. Family is from Patna.',
    phys:"Height 5'0\", stout, white saree, grey hair, fair complexion",
    marks:'Silver bangles, hearing aid in right ear', type:'elderly', status:'found',
    cname:'Ravi Devi', cphone:'+91-9000000001', crel:'Son',
    reporter:'u003', notes:'Found at Varanasi old age shelter on Jan 15. Reunited with family.',
    lat:25.3045, lng:83.0107
  },
  {
    id:'r004', cn:'TLS-2026-0024', name:'Rohit Verma', age:34, gender:'Male',
    last_seen:'2026-02-14', location:'City Railway Station, Bengaluru', state:'Karnataka',
    desc:'Man disappeared from Bengaluru railway station platform 4. Booked on a train to Hyderabad but never boarded. Belongings were recovered by station staff.',
    phys:"Height 5'9\", medium build, beard and mustache, short black hair",
    marks:'Lotus tattoo on right forearm', type:'adult', status:'missing',
    cname:'Anita Verma', cphone:'+91-8888888888', crel:'Wife',
    reporter:'u002', notes:'', lat:12.9766, lng:77.5713
  },
  {
    id:'r005', cn:'TLS-2026-0035', name:'Anjali Singh', age:8, gender:'Female',
    last_seen:'2026-02-20', location:'Near Government School, Saidapet, Chennai', state:'Tamil Nadu',
    desc:'Young girl was playing near school premises after school hours. Wearing a red frock and black shoes. Speaks Tamil and some Hindi.',
    phys:"Height 3'10\", very thin, long braided hair, dark complexion",
    marks:'Gap between front teeth, small scar on chin', type:'child', status:'missing',
    cname:'Vijay Singh', cphone:'+91-7777777777', crel:'Father',
    reporter:'u003', notes:'Amber Alert issued. Police actively searching.',
    lat:13.0197, lng:80.2209
  },
  {
    id:'r006', cn:'TLS-2026-0046', name:'Suresh Patel', age:22, gender:'Male',
    last_seen:'2026-03-01', location:'Ahmedabad Railway Station', state:'Gujarat',
    desc:'Young man went missing from Ahmedabad railway station. Was supposed to travel home for a family function and never arrived.',
    phys:"Height 5'8\", medium build, clean shaven, short hair",
    marks:'None noted', type:'adult', status:'pending',
    cname:'Meera Patel', cphone:'+91-9111000001', crel:'Sister',
    reporter:'u002', notes:'', lat:23.0225, lng:72.5714
  },
];

const insertReport = db.prepare(`
  INSERT INTO reports (id,case_number,name,age,gender,last_seen,location,state,description,
    physical_desc,identifying_marks,report_type,status,reporter_id,contact_name,contact_phone,
    contact_relation,admin_notes,created_at,updated_at)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))
`);

for (const r of reports) {
  insertReport.run(r.id,r.cn,r.name,r.age,r.gender,r.last_seen,r.location,r.state,
    r.desc,r.phys,r.marks,r.type,r.status,r.reporter,r.cname,r.cphone,r.crel,r.notes);
}
console.log(`✓ Seeded ${reports.length} reports`);

// Seed sightings with real Indian coordinates
const sightings = [
  { id:'sig001', rid:'r001', name:'Suresh M.', desc:'Saw a woman matching this description near Janpath market, wearing a blue dupatta and looking confused. I approached but she walked away quickly.', lat:28.6247, lng:77.2174, acc:15 },
  { id:'sig002', rid:'r001', name:'Anonymous', desc:'Possible sighting near Palika Bazaar underground market around 7pm. She was sitting alone near the food stalls.', lat:28.6327, lng:77.2198, acc:22 },
  { id:'sig003', rid:'r001', name:'Kavita R.', desc:'I think I saw her boarding a DTC bus at Connaught Place inner circle, bus 437 going towards Dwarka.', lat:28.6315, lng:77.2167, acc:18 },
  { id:'sig004', rid:'r002', name:'Mohammed A.', desc:'Boy matching description seen near Dharavi main road walking alone. Was in school uniform, looked scared. Called out but he ran.', lat:19.0456, lng:72.8572, acc:25 },
  { id:'sig005', rid:'r002', name:'Fatima S.', desc:'Possible sighting near Sion station. Boy sitting on platform bench, appeared to be waiting for someone.', lat:19.0422, lng:72.8616, acc:30 },
  { id:'sig006', rid:'r004', name:'Deepak N.', desc:'Man matching this description seen near Majestic bus stand, asking for directions to KR Market.', lat:12.9766, lng:77.5713, acc:20 },
  { id:'sig007', rid:'r005', name:'Anonymous', desc:'Little girl seen near Saidapet bridge with an older woman. Girl looked anxious.', lat:13.0197, lng:80.2209, acc:12 },
];

const insertSighting = db.prepare(
  'INSERT INTO sightings (id,report_id,reporter_name,description,lat,lng,accuracy) VALUES (?,?,?,?,?,?,?)'
);
for (const s of sightings) insertSighting.run(s.id, s.rid, s.name, s.desc, s.lat, s.lng, s.acc);
console.log(`✓ Seeded ${sightings.length} sightings`);

// Seed audit log
const audits = [
  { id:'a001', rid:'r001', action:'APPROVED', uid:'u001', notes:'Verified with Delhi Police records.' },
  { id:'a002', rid:'r002', action:'APPROVED', uid:'u001', notes:'Mumbai Police Case No. MB/25/8847.' },
  { id:'a003', rid:'r003', action:'FOUND',    uid:'u001', notes:'Reunited with family on Jan 15.' },
  { id:'a004', rid:'r005', action:'APPROVED', uid:'u001', notes:'Amber Alert issued.' },
];
const insertAudit = db.prepare('INSERT INTO audit_log (id,report_id,action,user_id,notes) VALUES (?,?,?,?,?)');
for (const a of audits) insertAudit.run(a.id, a.rid, a.action, a.uid, a.notes);
console.log(`✓ Seeded ${audits.length} audit logs`);

console.log('\n✅ Database seeded successfully!');
console.log('   Admin: admin@talaash.in / admin123');
console.log('   User:  rahul@example.com / user123');
db.close();
