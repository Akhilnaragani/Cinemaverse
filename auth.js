// 1) Init Supabase
const SUPABASE_URL = "https://hvbeswqunsadayqghhzv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2YmVzd3F1bnNhZGF5cWdoaHp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1NjQzNjcsImV4cCI6MjA3ODE0MDM2N30.rDvyGxFt8XO632S1Zw0ZANvYZaSsGgSb_pW49DXMMMg";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function showLoginPopup() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // 1) Try profiles.full_name
  let fullName = null;
  let profileError = null;

  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
    profileError = error;
    fullName = profile?.full_name || null;
  } catch (_) {}

  // 2) Fallbacks
  if (!fullName) fullName = user.user_metadata?.full_name || null;
  if (!fullName && user.email) fullName = user.email.split("@")[0];

  const popup = document.getElementById("welcome-popup");
  if (!popup || !fullName) return;

  popup.textContent = `✦ Hi, ${fullName}`;
  popup.classList.add("show");
  setTimeout(() => popup.classList.remove("show"), 2000);
}



// 2) Protect Page
async function requireAuth() {
  try {
    // First check session from memory
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Session error:', error);
      throw error;
    }
    
    if (session) {
      console.log('Active session found:', session.user.email);
      return session;
    }

    // If no session, check if we have a token in storage
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (!userError && user) {
      console.log('Valid user found:', user.email);
      return { user };
    }
    
    console.log('No active session found');
    return null;
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

// 3) Show Login/Logout UI correctly
async function updateAuthUI() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const loginBtns = document.querySelectorAll(".login-button");
    const logoutBtns = document.querySelectorAll(".logout-button");

    console.log('Updating UI, session:', session ? 'exists' : 'none');
    console.log('Found login buttons:', loginBtns.length);
    console.log('Found logout buttons:', logoutBtns.length);

    if (session) {
      console.log('Setting UI for logged in state');
      loginBtns.forEach(btn => {
        btn.style.display = "none";
        console.log('Hidden login button');
      });
      logoutBtns.forEach(btn => {
        btn.style.display = "inline-block";
        console.log('Showed logout button');
      });
    } else {
      console.log('Setting UI for logged out state');
      loginBtns.forEach(btn => {
        btn.style.display = "inline-block";
        console.log('Showed login button');
      });
      logoutBtns.forEach(btn => {
        btn.style.display = "none";
        console.log('Hidden logout button');
      });
    }
  } catch (error) {
    console.error('Error updating UI:', error);
  }
  if (localStorage.getItem("showGreeting") === "yes") {
  localStorage.removeItem("showGreeting");
  setTimeout(showLoginPopup, 300);
}

}

// 4) Logout Function
async function logout() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    console.log('Logged out successfully');
    window.location.replace('login.html');
  } catch (error) {
    console.error('Logout error:', error);
    alert('Error logging out. Please try again.');
  }
}

// Cache for active session state
let activeSession = null;

// Check if current page needs authentication
async function checkAuth() {
  const publicPages = ['login.html', 'index.html']; 
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  
  console.log('Checking auth for page:', currentPage);
  
  // If we're on login page and have active session, redirect to index
  if (currentPage === 'login.html' && activeSession) {
    console.log('Already logged in, redirecting from login page');
    window.location.replace('index.html');
    return false;
  }
  
  // Don't check auth for public pages
  if (publicPages.includes(currentPage)) {
    console.log('Public page detected:', currentPage);
    return true;
  }
  
  // Check session if we don't have one cached
  if (!activeSession) {
    console.log('Checking session status...');
    activeSession = await requireAuth();
  }
  
  if (activeSession) {
    console.log('Valid session found, allowing access');
    return true;
  }
  
  // Only redirect if no session found
  console.log('No valid session, redirecting to login');
  window.location.replace('login.html?redirect=' + encodeURIComponent(currentPage));
  return false;
}

// Initialize authentication on page load
async function initAuth() {
  if (await checkAuth()) {
    await updateAuthUI();
  }
}

// Make these accessible to HTML
window.requireAuth = requireAuth;
window.updateAuthUI = updateAuthUI;
window.logout = logout;
window.checkAuth = checkAuth;
window.initAuth = initAuth;

// Auto update UI on auth change
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth state changed:', event, 'Session:', session ? 'exists' : 'none');
  
  // Only redirect on sign out
  if (event === 'SIGNED_OUT') {
    window.location.replace('login.html');
    return;
  }
  
  // For sign in, stay on current page and update UI
  if (event === 'SIGNED_IN') {
    updateAuthUI();
    return;
  }

  // For token refresh etc, just update UI
  updateAuthUI();
});
