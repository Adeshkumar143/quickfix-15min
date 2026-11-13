import { useState, useEffect } from 'react';

function App() {
  const [role, setRole] = useState('customer');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [service, setService] = useState('Electrician');
  const [bookings, setBookings] = useState([]);
  const [partners, setPartners] = useState([]);

  // Auth & Login States
  const [pName, setPName] = useState('');
  const [pPhone, setPPhone] = useState('');
  const [pSkill, setPSkill] = useState('Electrician');
  const [loginPhone, setLoginPhone] = useState('');
  const [loggedPartner, setLoggedPartner] = useState(null);
  const [adminPin, setAdminPin] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const prices = { Electrician: 299, Plumber: 349, 'AC Repair': 499, Cleaner: 399 };

  const load = async () => {
    const b = await (await fetch(`${API}/bookings`)).json();
    const p = await (await fetch(`${API}/partners`)).json();
    setBookings(b.bookings || []);
    setPartners(p.partners || []);
  };

  useEffect(() => { load(); }, []);

  const book = async (e) => {
    e.preventDefault();
    await fetch(`${API}/book-service`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_name: name, customer_phone: phone, service_type: service, address, price: prices[service] })
    });
    alert('✅ Booking Confirmed! 15 Min mein Partner aayega.');
    setName(''); setPhone(''); setAddress(''); load();
  };

  const regPartner = async (e) => {
    e.preventDefault();
    await fetch(`${API}/register-partner`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: pName, phone: pPhone, skill: pSkill })
    });
    alert('Registered! Admin approval ke baad Phone se Login karein.');
    setPName(''); setPPhone(''); load();
  };

  const loginPartner = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API}/partner-login/${loginPhone}`);
    if (!res.ok) return alert('❌ Number registered nahi hai!');
    const data = await res.json();
    if (!data.partner.is_approved) return alert('⏳ Aapka account abhi Admin approval ke liye pending hai.');
    setLoggedPartner(data.partner);
  };

  const act = async (url) => { await fetch(`${API}${url}`, { method: 'PUT' }); load(); };
  const done = bookings.filter(b => b.status === 'Completed & Paid');
  const profit = done.reduce((s, b) => s + (b.commission || 0), 0);

  return (
    <div style={{ maxWidth: '600px', margin: '15px auto' }}>
      <h1 style={{ textAlign: 'center', color: '#2563eb' }}>⚡ QuickFix 15-Min</h1>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '20px' }}>
        <button onClick={() => setRole('customer')}>👤 Customer</button>
        <button onClick={() => setRole('partner')}>🛠️ Partner</button>
        <button onClick={() => setRole('admin')}>👑 Admin</button>
      </div>

      {role === 'customer' && (
        <form onSubmit={book} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <select value={service} onChange={e => setService(e.target.value)}>
            <option value="Electrician">⚡ Electrician - ₹299</option>
            <option value="Plumber">🚰 Plumber - ₹349</option>
            <option value="AC Repair">❄️ AC Repair - ₹499</option>
            <option value="Cleaner">🧹 Cleaner - ₹399</option>
          </select>
          <input placeholder="Aapka Naam" value={name} onChange={e => setName(e.target.value)} required />
          <input placeholder="Mobile Number" value={phone} onChange={e => setPhone(e.target.value)} required />
          <input placeholder="Poora Address" value={address} onChange={e => setAddress(e.target.value)} required />
          <button type="submit">Book Now (₹{prices[service]})</button>
        </form>
      )}

      {role === 'partner' && !loggedPartner && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <form onSubmit={loginPartner} style={{ display: 'flex', gap: '8px' }}>
            <input placeholder="Registered Phone se Login Karein" value={loginPhone} onChange={e => setLoginPhone(e.target.value)} required />
            <button type="submit">Login</button>
          </form>
          <hr />
          <h3>🆕 Naya Partner Register Karein</h3>
          <form onSubmit={regPartner} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input placeholder="Mistri Name" value={pName} onChange={e => setPName(e.target.value)} required />
            <input placeholder="Phone Number" value={pPhone} onChange={e => setPPhone(e.target.value)} required />
            <select value={pSkill} onChange={e => setPSkill(e.target.value)}>
              <option>Electrician</option><option>Plumber</option><option>AC Repair</option><option>Cleaner</option>
            </select>
            <button type="submit">Register</button>
          </form>
        </div>
      )}

      {role === 'partner' && loggedPartner && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Welcome, {loggedPartner.name} ({loggedPartner.skill})</h3>
            <button onClick={() => setLoggedPartner(null)}>Logout</button>
          </div>
          {bookings.filter(b => b.service_type === loggedPartner.skill).map(b => (
            <div key={b.id} style={{ border: '1px solid #ccc' }}>
              <b>#{b.id} {b.service_type} (₹{b.price})</b> - {b.status}
              <div>{b.customer_name} ({b.customer_phone}) | {b.address}</div>
              {b.status === 'Searching for Partner (15-Min)' && (
                <button onClick={() => act(`/accept-order/${b.id}/${loggedPartner.name}`)} style={{ marginTop: '8px' }}>Accept Order</button>
              )}
              {b.status === 'Partner Accepted - Arriving in 15 Mins' && (
                <button onClick={() => act(`/complete-order/${b.id}`)} style={{ marginTop: '8px' }}>Mark Complete</button>
              )}
            </div>
          ))}
        </div>
      )}

      {role === 'admin' && !isAdmin && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <input type="password" placeholder="Admin Secret PIN (1234)" value={adminPin} onChange={e => setAdminPin(e.target.value)} />
          <button onClick={() => adminPin === '1234' ? setIsAdmin(true) : alert('Galat PIN!')}>Unlock Admin</button>
        </div>
      )}

      {role === 'admin' && isAdmin && (
        <div>
          <h3>👑 Total Commission (20%): ₹{profit}</h3>
          {partners.map(p => (
            <div key={p.id} style={{ border: '1px solid #ccc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{p.name} ({p.skill}) - {p.phone}</span>
              {p.is_approved ? '✅ Approved' : <button onClick={() => act(`/approve-partner/${p.id}`)}>Approve</button>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
export default App;
