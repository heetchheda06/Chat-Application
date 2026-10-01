# 📡 WaveChat: Wireless Chat Application Using Client-Server Communication

> **"Connect. Communicate. In Real Time."**  
> A college mini/major project for **Wireless Mobile Communication (WMC)** demonstrating client-server architecture, TCP/IP sockets, full-duplex WebSocket transmission, and Wi-Fi / cellular packet routing.

---

## 📌 Project Overview
**WaveChat** is a production-grade, real-time wireless messaging application engineered to demonstrate fundamental networking and wireless communication concepts. Two or more client stations (laptops, mobile phones, or desktop PCs) communicate in real time across a local wireless network (WLAN / Wi-Fi) or mobile cellular network (4G/5G) through a central Node.js server.

The project incorporates both **MongoDB + Mongoose** for persistent data storage and a **seamless zero-config local JSON file fallback**, allowing the application to be demonstrated on any computer with zero database setup.

---

## 🛰️ Wireless Mobile Communication (WMC) Concepts Demonstrated
1. **Wireless Data Transmission**: Radio frequency (2.4 GHz / 5 GHz) transmission between wireless stations and Access Points (AP).
2. **Client-Server Architecture**: Centralized server coordinating authentication, routing, and persistence.
3. **TCP/IP Communication**: Reliable, sequenced, connection-oriented packet delivery on Port 3000.
4. **HTTP/HTTPS (Layer 7)**: Stateless request-response protocol for user registration, login, and REST APIs.
5. **WebSocket / Socket.IO (Layer 7)**: Full-duplex bidirectional streaming channel for sub-millisecond chat delivery.
6. **Wi-Fi Network Communication (IEEE 802.11)**: Real-time packet exchange between devices on the same wireless SSID.
7. **4G / 5G Cellular Networks**: Wide-area wireless packet service for communication across different network subnets.
8. **Real-Time Presence Tracking**: Real-time 🟢 Online / ⚫ Offline detection using socket heartbeat ping/pong.
9. **Multicast Group Broadcasting**: Point-to-multipoint packet distribution to all members in a room.
10. **IP Addressing & Port Multiplexing**: Routing using local IPv4 subnets (e.g., `192.168.x.x:3000` or `10.x.x.x:3000`).

---

## 🏗️ System Architecture & Packet Flow

```
+-----------------------------------------------------------------------------------+
|                           WAVECHAT WIRELESS ARCHITECTURE                           |
+-----------------------------------------------------------------------------------+

   [ Station A: Laptop ]                                     [ Station B: Mobile Phone ]
    (IP: 10.235.30.22)                                        (IP: 10.235.30.45)
            |                                                         ^
            |  1. Transmit Frame                                      |  5. Forward Packet
            v  (IEEE 802.11 Wi-Fi)                                    |  (Socket.IO Event)
   +--------------------+                                    +--------------------+
   |  Wi-Fi Access Point |                                    |  Cell Tower / AP   |
   +--------------------+                                    +--------------------+
            |                                                         ^
            |  2. TCP/IP Route (Port 3000)                            |  4. Socket Room Push
            v                                                         |
   +------------------------------------------------------------------------------+
   |                     CENTRAL NODE.JS + EXPRESS SERVER                         |
   |                         (Host IP: 10.235.30.15:3000)                         |
   |                                                                              |
   |   - Express.js REST API: Authentication (JWT) & History Endpoints             |
   |   - Socket.IO Engine: Heartbeat, Session Map (userId -> socketId)            |
   |   - Database Adapter: MongoDB (Mongoose) + Local JSON Fallback               |
   +------------------------------------------------------------------------------+
                                          |
                         3. Persist Packet in Collection
                                          v
                              [( MongoDB / Data JSON )]
```

---

## 🛠️ Technology Stack
- **Frontend**: HTML5, CSS3, JavaScript (ES6+), Bootstrap 5, Bootstrap Icons, Google Fonts (Inter & Outfit).
- **Backend**: Node.js (v18+), Express.js (v4.21).
- **Real-Time Engine**: Socket.IO (v4.8) over WebSockets & Engine.IO long-polling fallback.
- **Database**: MongoDB with Mongoose (with transparent zero-dependency local JSON file fallback).
- **Security & Auth**: bcryptjs (password salt hashing), JSON Web Tokens (JWT), CORS, Environment variables (`dotenv`).

---

## 📁 Folder Structure
```
Chat app/
├── client/                      # Frontend Client Application
│   ├── index.html               # Professional Landing Page & Architecture Showcase
│   ├── login.html               # Login page with 1-click viva demo credentials
│   ├── register.html            # User registration with field validation
│   ├── chat.html                # Real-time chat dashboard (1-to-1 & groups)
│   ├── groups.html              # Dedicated group creation & management page
│   ├── profile.html             # User profile and station status
│   ├── wmc.html                 # WMC Visual Architecture & Interactive Packet Simulator
│   ├── network.html             # Live Network Status & Ping/RTT Latency Tester
│   ├── admin.html               # Administrator Dashboard (User management & stats)
│   ├── css/
│   │   ├── style.css            # Global design tokens, gradients & animations
│   │   ├── auth.css             # Authentication layouts
│   │   └── chat.css             # Messaging bubbles, sidebars & typing badges
│   └── js/
│       ├── auth.js              # Token management & API request helper
│       ├── socket.js            # Socket.IO client & Web Audio API chime
│       ├── chat.js              # Chat rendering, typing events & history loader
│       ├── groups.js            # Group modal and member management
│       └── network.js           # Live IP inspector and ping latency test runner
│
├── server/                      # Backend Server Application
│   ├── server.js                # Express & HTTP server bootstrapper with Wi-Fi IP detection
│   ├── socket.js                # Socket.IO connection handler & event dispatcher
│   ├── config/
│   │   ├── database.js          # MongoDB connection with auto-fallback & seeder
│   │   └── fileDb.js            # JSON local persistence engine
│   ├── models/
│   │   ├── User.js              # User schema & profile methods
│   │   ├── Message.js           # Message schema (text, sender, receiver, group)
│   │   └── Group.js             # Multicast group schema
│   ├── routes/
│   │   ├── auth.js              # Register, login, me, profile, demo-users
│   │   ├── users.js             # User search and discovery
│   │   ├── messages.js          # Direct chat history & REST message sending
│   │   ├── groups.js            # Group CRUD & multicast message history
│   │   ├── admin.js             # Admin metrics, user toggle active/delete
│   │   └── network.js           # Real-time network interfaces & ping endpoint
│   └── middleware/
│       └── auth.js              # JWT authentication & admin authorization guards
│
├── data/                        # Local database files (auto-created on fallback)
│   ├── users.json
│   ├── messages.json
│   └── groups.json
│
├── .env                         # Server environment variables
├── .gitignore                   # Git ignore file
├── package.json                 # Node dependencies and npm scripts
├── README.md                    # Project README and quickstart guide
├── DOCUMENTATION.md             # Full 27-Section Academic College Project Report
└── VIVA_GUIDE.md                # Comprehensive Viva Voce Questions & Answers
```

---

## ⚡ Installation & Setup

### 1. Prerequisites
- **Node.js** (v18 or higher recommended)
- **Git**
- *(Optional)* **MongoDB** (If MongoDB is not installed or not running, the application automatically engages its built-in local JSON file database with zero configuration needed!)

### 2. Clone the Repository
```bash
git clone https://github.com/heetchheda06/Chat-Application.git
cd Chat-Application
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Environment Variables
Create or verify `.env` in the root folder:
```env
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/wavechat
JWT_SECRET=wavechat_super_secret_jwt_key_2026_wmc_project
USE_LOCAL_STORAGE_FALLBACK=true
```

### 5. Start the Server
```bash
npm start
```
The server will output:
```
====================================================
       📡 WAVECHAT - WIRELESS CHAT APPLICATION       
  Client-Server Real-Time Wireless Mobile Communication
====================================================
🚀 [Local Access]      http://localhost:3000
📶 [Wi-Fi/LAN Access]   http://<YOUR-WIFI-IP>:3000
====================================================
```

---

## 📱 How to Test Over Wi-Fi / Local Area Network
1. Keep the WaveChat server running on Computer A.
2. Note the **Wi-Fi/LAN Access URL** printed in the terminal (e.g. `http://10.235.30.15:3000`).
3. Connect Computer B or a Smartphone to the **same Wi-Fi network**.
4. Open the browser on your phone/Computer B and type: `http://<COMPUTER-A-IP>:3000`.
5. Log in as **Rahul** on your phone and as **Heet** on Computer A.
6. Send messages — they will appear across devices instantly with sub-second latency!

---

## 🔑 Pre-Configured Demo Accounts (For Viva Evaluation)
| Username | Full Name | Password | Role |
| :--- | :--- | :--- | :--- |
| `heet` | Heet Patel | `password123` | **Admin** |
| `rahul` | Rahul Sharma | `password123` | **User** |
| `om` | Om Verma | `password123` | **User** |
| `jay` | Jay Mehta | `password123` | **User** |

*Tip: On `login.html`, click any of the one-click demo pills to automatically sign in without typing.*

---

## 🌐 REST API Endpoints
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register new user node | No |
| `POST` | `/api/auth/login` | Authenticate user & get JWT token | No |
| `GET` | `/api/auth/me` | Fetch currently authenticated user | Yes |
| `PUT` | `/api/auth/profile` | Update profile details | Yes |
| `POST` | `/api/auth/logout` | End session & set status offline | Yes |
| `GET` | `/api/users` | List & search active users | Yes |
| `GET` | `/api/messages/:userId` | Fetch 1-to-1 chat history | Yes |
| `POST` | `/api/messages` | Send a 1-to-1 message | Yes |
| `GET` | `/api/groups` | List user's multicast groups | Yes |
| `POST` | `/api/groups` | Create new multicast group | Yes |
| `GET` | `/api/groups/:id/messages`| Fetch group chat history | Yes |
| `POST` | `/api/groups/:id/messages`| Send group message | Yes |
| `GET` | `/api/network/info` | Server IP, port, interfaces & protocols | No |
| `GET` | `/api/network/ping` | ICMP/HTTP ping for RTT latency test | No |
| `GET` | `/api/admin/stats` | Admin metrics & system resources | Yes (Admin) |

---

## 🔌 Socket.IO Real-Time Events
- **`user_online`**: Client announces wireless connection. Server marks user online and broadcasts `user_status_changed`.
- **`private_message`**: Sends direct packet from Client A to Client B via server routing.
- **`group_message`**: Multicasts packet to all sockets in room `group_<groupId>`.
- **`typing` / `stop_typing`**: Transmits typing indicators to counterpart node.
- **`join_group` / `leave_group`**: Joins/leaves socket rooms for multicast routing.
- **`disconnect`**: Server detects loss of heartbeat signal and broadcasts `user_status_changed` (offline).

---

## 📄 License
This project is open-source and created for educational evaluation in Wireless Mobile Communication (WMC).
