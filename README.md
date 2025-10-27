# 🕵️‍♀️ Family Spyfall

A digital version of the classic Spyfall party game! Perfect for family game nights, virtual hangouts, or any time you want to have some fun with friends and family.

## 🎮 How to Play Spyfall

**The Goal:** Find the spy among you, or if you're the spy, figure out the secret location!

### The Setup
- One player is secretly the **spy** 🕵️‍♀️
- Everyone else knows the **secret location** (like "restaurant" or "space station")
- The spy doesn't know the location but tries to blend in

### The Gameplay
1. **Ask Questions:** Players take turns asking each other questions about the location
2. **Be Clever:** Ask questions that only someone who knows the location could answer
3. **Stay Suspicious:** Look for answers that seem vague or suspicious
4. **Accuse Someone:** When you think you've found the spy, call for a vote
5. **Vote:** Everyone votes on whether the accused person is the spy

### How to Win
- **Civilians win** if they correctly identify the spy
- **Spy wins** if they figure out the location OR if an innocent person gets accused

**Pro Tip:** The spy should ask general questions and give vague answers. Civilians should ask specific questions that only someone who knows the location could answer!

## 🎉 About This Game

This is a fun little project I built because I love playing Spyfall with my family! It's completely free to use and enjoy. Feel free to play it, share it, or even contribute to make it better.

The game works great on phones, tablets, and computers - perfect for when you can't all be in the same room but still want to play together!

## 🚀 How to Run It

### Quick Start with Your Own Domain

1. **Clone the repository:**
   ```bash
   git clone https://github.com/kevholditch/family-spyfall.git
   cd family-spyfall
   ```

2. **Deploy with your domain:**
   ```bash
   make local-deploy DOMAIN=yourdomain.com
   ```

3. **Set up your domain:**
   - Open http://localhost:81 in your browser
   - Login with: `admin@example.com` / `changeme`
   - Create proxy hosts:
     - `web.yourdomain.com` → `http://spyfall-web:80`
     - `api.yourdomain.com` → `http://spyfall-api:4000`
   - Generate SSL certificates for both hosts

4. **Start playing:**
   - Visit `https://web.yourdomain.com`
   - Create a game and share the QR code with your friends!

### What You Need
- Docker and Docker Compose installed
- A domain name (or subdomain) that points to your server
- That's it! 🎉

The game will automatically handle SSL certificates and set up everything you need to start playing immediately.

---

**Have fun and may the best detective win! 🕵️‍♀️🎉**