# 🎬 Cinemaverse

🚀 **Live Website:** https://cinemaverse-six.vercel.app/

Cinemaverse is a modern streaming-style web application where users can explore movies and series, manage their watchlist, and enjoy a clean, responsive UI inspired by platforms like Netflix.

---

## ✨ Features

* 🔐 **User Authentication**

  * Signup, Login, Logout (powered by Supabase)
  * Session persistence across pages

* 🎥 **Dynamic Content**

  * Movies & Series fetched from database
  * Categorized sections (Top, Latest, Comedy, Horror, etc.)
  * Admin panel to add/remove content

* 🔍 **Real-Time Search**

  * Instant filtering across pages
  * Debounced search for performance

* ❤️ **Watchlist**

  * Add/remove movies dynamically
  * Stored per user

* 🎨 **Modern UI/UX**

  * Dark theme (Netflix-style)
  * Smooth hover effects
  * Responsive design (desktop + mobile)

---

## 🛠️ Tech Stack

* **Frontend:** HTML, CSS, JavaScript
* **Backend/Database:** Supabase
* **Authentication:** Supabase Auth
* **Deployment:** Vercel

---

## 📁 Project Structure

```
Cinemaverse/
│── index.html
│── movies.html
│── series.html
│── watchlist.html
│── login.html
│── admin.html
│── style.css
│── script.js
│── auth.js
│── assets/
```

---

## ⚙️ Setup Instructions

1. Clone the repository:

```bash
git clone https://github.com/your-username/Cinemaverse.git
```

2. Open the project:

```bash
cd Cinemaverse
```

3. Run locally:

* Open `index.html` in your browser
  OR use Live Server (VS Code recommended)

---

## 🔑 Environment Setup (Supabase)

* Create a project on Supabase

* Add your:

  * `SUPABASE_URL`
  * `SUPABASE_ANON_KEY`

* Configure authentication redirect URLs:

```
/login.html
/reset-password.html
```

---

## 📸 Screenshots

* Homepage with dynamic movie sliders
* Movies & Series categorized layout
* Watchlist page
* Admin dashboard

---

## 🚧 Future Improvements

* 👤 User profile with avatar upload
* ⭐ Movie ratings & reviews
* ⚡ Performance optimization & caching
* 🎬 Video streaming integration

---

## 🤝 Contributing

Feel free to fork this repo and improve it!
Pull requests are welcome.

---

## 📄 License

This project is for educational purposes.

---

## 💡 Inspiration

Inspired by modern OTT platforms like Netflix & Prime Video.

---

🔥 Built with passion by **Akhil**

