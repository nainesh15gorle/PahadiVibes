# 🏔️ PahadiVibes

<div align="center">

### Crafted by Hands. Inspired by Heritage.

A premium full-stack artisan e-commerce platform built to showcase handcrafted Indian Mandala Art and heritage-inspired decor through a modern luxury shopping experience.

---

🌐 **Live Demo:** https://pahadivibes.vercel.app

</div>

---

## 📖 Overview

PahadiVibes is a mobile-first luxury e-commerce platform designed to connect traditional Indian craftsmanship with modern digital commerce.

The platform provides a complete shopping ecosystem including:

* Product Discovery
* User Authentication
* Cart Management
* Secure Checkout
* Order Processing
* Inventory Management
* Analytics Dashboard
* Admin Portal

The project focuses heavily on premium UI/UX, responsiveness, scalability, and real-world e-commerce workflows.

---

# ✨ Features

## Customer Features

### Authentication

* Secure User Registration
* Login & Logout
* Google Authentication
* Protected Routes
* Session Management

### Shopping Experience

* Browse Artisan Collections
* Product Search
* Category Filtering
* Product Details Page
* Related Products
* Wishlist Management
* Add To Cart
* Quantity Management

### Checkout

* Mobile Optimized Checkout
* Order Summary
* Payment Integration
* Order Confirmation

### User Account

* View Orders
* Manage Profile
* Track Purchases

---

## Admin Features

### Product Management

* Add Products
* Edit Products
* Delete Products
* Upload Product Images
* Manage Categories
* Manage Pricing

### Inventory Management

* Track Stock Levels
* Update Inventory
* Mark Products In Stock / Out Of Stock

### Order Management

* View Orders
* Update Order Status
* Process Orders
* Manage Deliveries

### Analytics Dashboard

* Revenue Overview
* Total Orders
* Total Customers
* Product Performance
* Inventory Insights

---

# 🏗 Architecture

```text
Customer Website
        │
        ▼
Next.js Frontend
        │
        ▼
Supabase Authentication
        │
        ▼
Supabase PostgreSQL Database
        │
        ▼
Cloudinary Media Storage
        │
        ▼
Admin Dashboard
```

---

# 🛠 Tech Stack

## Frontend

* Next.js 15
* React
* TypeScript
* Tailwind CSS
* Framer Motion
* Lucide Icons

## Backend

* Next.js API Routes
* Server Actions

## Database

* Supabase PostgreSQL

## Authentication

* Supabase Auth
* Google OAuth

## Media Storage

* Cloudinary

## Deployment

* Vercel

---

# 📱 Mobile-First Design

The platform is designed primarily for mobile users.

### Responsive Support

* Mobile Phones
* Tablets
* Laptops
* Large Screens

### Mobile Optimizations

* Touch Friendly Navigation
* Responsive Product Cards
* Mobile Search Experience
* Optimized Checkout Flow
* Adaptive Typography
* Mobile Drawer Navigation

---

# 📂 Project Structure

```bash
PahadiVibes
│
├── app/
│   ├── admin/
│   ├── products/
│   ├── checkout/
│   ├── cart/
│   └── auth/
│
├── components/
│
├── lib/
│   ├── supabase/
│   ├── cloudinary/
│   └── utils/
│
├── hooks/
│
├── public/
│
├── styles/
│
├── types/
│
└── README.md
```

---

# 🚀 Getting Started

## Clone Repository

```bash
git clone https://github.com/nainesh15gorle/E-commerce-handicraft-website.git
```

## Navigate Into Project

```bash
cd E-commerce-handicraft-website
```

## Install Dependencies

```bash
npm install
```

## Environment Variables

Create:

```env
.env.local
```

Add:

```env
NEXT_PUBLIC_SUPABASE_URL=

NEXT_PUBLIC_SUPABASE_ANON_KEY=

SUPABASE_SERVICE_ROLE_KEY=

CLOUDINARY_CLOUD_NAME=

CLOUDINARY_API_KEY=

CLOUDINARY_API_SECRET=

NEXT_PUBLIC_SITE_URL=
```

## Run Development Server

```bash
npm run dev
```

Open:

```bash
http://localhost:3000
```

---

# 🗄 Database Design

### Products

* Product Information
* Categories
* Pricing
* Images
* Inventory

### Orders

* Customer Information
* Purchased Products
* Payment Details
* Order Status

### Users

* Authentication
* Profiles
* Purchase History

---

# ⚡ Performance

### Optimizations

* Image Optimization
* Lazy Loading
* Code Splitting
* Server Components
* Dynamic Imports

### Goals

* Lighthouse Score 90+
* Fast Initial Load
* SEO Optimized
* Mobile Performance Optimized

---

# 🔒 Security

* Protected Admin Routes
* Secure Authentication
* Environment Variable Protection
* Server-Side Validation
* Secure API Communication

---

# 🎯 Key Learnings

This project demonstrates:

* Full Stack Development
* Authentication Systems
* Database Design
* Cloud Storage Integration
* Responsive UI Engineering
* E-Commerce Architecture
* State Management
* Production Deployment

---

# 📈 Future Improvements

* Product Reviews
* AI Recommendations
* Multi-language Support
* Advanced Analytics
* Email Notifications
* Progressive Web App (PWA)
* Order Tracking

---

# 👨‍💻 Developer

### Nainesh Babu

Full Stack Developer passionate about building scalable, user-centric web applications with modern technologies.

**Tech Interests**

* Full Stack Development
* System Design
* Cloud Technologies
* UI/UX Engineering
* Product Development

---

<div align="center">

### ❤️ Preserving Indian Heritage Through Technology

Built with Next.js, Supabase, Cloudinary, and a passion for handcrafted artistry.

</div>
