# 🚀 Tech Net Server - Backend API

![Tech Net Backend](./public/images/banner.png)

Welcome to the **Tech Net Server**, the robust backend API powering the Haylou smartwatch e-commerce platform. Built with Express.js and MongoDB, this RESTful API provides secure and scalable endpoints for product management, user authentication, and order processing.

---

## 🌟 Live Client Application

**🔗 [Tech Net Store - Live Demo](https://awesometechnet.netlify.app) | [Frontend Repo](https://github.com/aihridoy/technet)**

Experience the complete e-commerce platform powered by this backend API!

---

## ✨ API Features

### 🛒 Core Functionality

- **Product Management**: Complete CRUD operations for smartwatch catalog
- **User Management**: User registration, authentication, and profile management
- **Order Processing**: Order creation, tracking, and management
- **Secure Authentication**: JWT-based user authentication
- **Database Integration**: MongoDB with native driver
- **CORS Enabled**: Cross-origin resource sharing for frontend integration

### 📊 API Endpoints

- **Products API**: `/api/products` - Product catalog management
- **Users API**: `/api/users` - User authentication and profiles
- **Orders API**: `/api/orders` - Order processing and tracking
- **Health Check**: `/api/health` - Server status monitoring

---

## 🛠️ Tech Stack

### Backend Framework

- **Runtime**: [Node.js](https://nodejs.org/) (Latest LTS)
- **Framework**: [Express.js 4.18.2](https://expressjs.com/)
- **Database**: [MongoDB 4.12.0](https://www.mongodb.com/) with native driver
- **Environment**: [dotenv 16.0.3](https://github.com/motdotla/dotenv)
- **CORS**: [cors 2.8.5](https://github.com/expressjs/cors)

### Development Tools

- **Development Server**: [Nodemon 2.0.20](https://nodemon.io/)
- **Package Manager**: npm/yarn
- **Version Control**: Git

### Deployment

- **Production**: Vercel serverless functions
- **Database**: MongoDB Atlas cloud database
- **Environment**: Production-ready configuration

---

## 📁 Project Structure

```
technet-server/
├── controllers/                    # Request handlers and business logic
│   ├── orderController.js         # Order management logic
│   ├── productController.js       # Product CRUD operations
│   └── userController.js          # User authentication & management
├── models/                        # MongoDB data models
│   ├── orderModel.js              # Order schema and methods
│   ├── productModel.js            # Product schema and methods
│   └── userModel.js               # User schema and methods
├── routes/                        # Express route definitions
│   ├── orderRoutes.js             # Order-related endpoints
│   ├── productRoutes.js           # Product-related endpoints
│   └── userRoutes.js              # User-related endpoints
├── utils/                         # Utility functions and configurations
│   ├── config.js                  # Application configuration
│   └── db.js                      # Database connection setup
├── node_modules/                  # Dependencies (auto-generated)
├── .env                          # Environment variables
├── .gitignore                    # Git ignore rules
├── index.js                      # Server entry point
├── package-lock.json             # Dependencies lock file
├── package.json                  # Project dependencies and scripts
├── products.json                 # Sample product data
├── vercel.json                   # Vercel deployment configuration
└── yarn.lock                     # Yarn dependencies lock
```

---

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have:

- **Node.js** (>= 16.x) - [Download here](https://nodejs.org/)
- **MongoDB Atlas** account or local MongoDB instance
- **Git** - [Download here](https://git-scm.com/)
- **npm** or **yarn** package manager

### Installation Steps

1. **Clone the Repository**

   ```bash
   git clone https://github.com/yourusername/technet-server.git
   cd technet-server
   ```

2. **Install Dependencies**

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Environment Configuration**

   Create a `.env` file in the root directory:

   ```env
   # Database Configuration
   DB_USER=your_db_username
   DB_PASS=your_db_user_password

   # MongoDB Connection
   MONGODB_URI=mongodb+srv://${DB_USER}:${DB_PASS}@cluster.mongodb.net/technet?retryWrites=true&w=majority

   # Server Configuration
   PORT=8000
   NODE_ENV=development

   # CORS Configuration
   CLIENT_URL=https://awesometechnet.netlify.app
   DEV_CLIENT_URL=http://localhost:3000
   ```

4. **Start Development Server**

   ```bash
   npm run dev
   # Server starts on http://localhost:8000
   ```

5. **Test API Endpoints**

   ```bash
   # Health check
   curl http://localhost:8000/api/health

   # Get all products
   curl http://localhost:8000/api/products
   ```

### Production Build

```bash
# Start production server
npm start

# For Vercel deployment
vercel --prod
```

---

## 📚 API Documentation

### 🏥 Health Check

**GET** `/api/health`

```json
{
  "status": "OK",
  "message": "Tech Net Server is running",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 📱 Products API

**GET** `/api/products`

- **Description**: Retrieve all products
- **Response**: Array of product objects

**GET** `/api/products/:id`

- **Description**: Retrieve single product by ID
- **Response**: Single product object

**POST** `/api/products` _(Admin only)_

- **Description**: Create new product
- **Body**: Product data object

**PUT** `/api/products/:id` _(Admin only)_

- **Description**: Update existing product
- **Body**: Updated product data

**DELETE** `/api/products/:id` _(Admin only)_

- **Description**: Delete product

### 👥 Users API

**POST** `/api/users/register`

- **Description**: Register new user
- **Body**: `{ email, password, name }`

**POST** `/api/users/login`

- **Description**: User authentication
- **Body**: `{ email, password }`

**GET** `/api/users/profile` _(Protected)_

- **Description**: Get user profile
- **Headers**: `Authorization: Bearer <token>`

**PUT** `/api/users/profile` _(Protected)_

- **Description**: Update user profile
- **Headers**: `Authorization: Bearer <token>`

### 🛒 Orders API

**GET** `/api/orders` _(Protected)_

- **Description**: Get user orders
- **Headers**: `Authorization: Bearer <token>`

**POST** `/api/orders` _(Protected)_

- **Description**: Create new order
- **Body**: Order data object
- **Headers**: `Authorization: Bearer <token>`

**GET** `/api/orders/:id` _(Protected)_

- **Description**: Get specific order details
- **Headers**: `Authorization: Bearer <token>`

**PUT** `/api/orders/:id/status` _(Admin only)_

- **Description**: Update order status
- **Body**: `{ status }`

---

## 📊 Database Models

### Product Model Structure

```javascript
{
  _id: ObjectId,
  name: String,           // e.g., "Haylou Solar Pulse RT3"
  price: Number,          // e.g., 48.79
  rating: Number,         // e.g., 5
  availability: String,   // "In stock" | "Out of stock"
  image: String,          // Product image URL
  description: String,    // Product description
  features: Array,        // Array of feature strings
  category: String,       // Product category
  brand: String,          // "Haylou"
  createdAt: Date,
  updatedAt: Date
}
```

### User Model Structure

```javascript
{
  _id: ObjectId,
  name: String,
  email: String,          // Unique
  password: String,       // Hashed
  role: String,           // "user" | "admin"
  profile: {
    phone: String,
    address: Object,
    preferences: Object
  },
  orders: Array,          // References to order IDs
  createdAt: Date,
  updatedAt: Date
}
```

### Order Model Structure

```javascript
{
  _id: ObjectId,
  userId: ObjectId,       // Reference to user
  orderNumber: String,    // Unique order identifier
  items: Array,           // Array of order items
  total: Number,          // Total order amount
  status: String,         // "pending" | "processing" | "shipped" | "delivered"
  shippingAddress: Object,
  paymentMethod: String,
  paymentStatus: String,  // "pending" | "paid" | "failed"
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🔧 Configuration Files

### Express Server Setup (index.js)

```javascript
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(
  cors({
    origin: [process.env.CLIENT_URL, process.env.DEV_CLIENT_URL],
  })
);
app.use(express.json());

// Routes
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/orders", require("./routes/orderRoutes"));

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Tech Net Server is running",
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Database Connection (utils/db.js)

```javascript
const { MongoClient } = require("mongodb");

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster.mongodb.net/technet?retryWrites=true&w=majority`;

let db;

const connectDB = async () => {
  try {
    const client = new MongoClient(uri);
    await client.connect();
    db = client.db("technet");
    console.log("Connected to MongoDB");
    return db;
  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1);
  }
};

const getDB = () => {
  if (!db) {
    throw new Error("Database not initialized");
  }
  return db;
};

module.exports = { connectDB, getDB };
```

---

## 🔐 Security Features

### CORS Configuration

```javascript
const corsOptions = {
  origin: ["https://awesometechnet.netlify.app", "http://localhost:5173"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};
```

### Environment Security

- Sensitive credentials stored in environment variables
- MongoDB connection string with authentication
- JWT secrets for token-based authentication
- Production vs development environment separation

---

## 📈 Performance & Monitoring

### Database Optimization

- Indexed collections for faster queries
- Efficient aggregation pipelines
- Connection pooling with MongoDB native driver

### API Performance

- Lightweight Express.js framework
- Minimal middleware stack
- Efficient JSON parsing and response handling

### Error Handling

```javascript
// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Something went wrong!",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal server error",
  });
});
```

---

## 🚀 Deployment

### Vercel Configuration (vercel.json)

```json
{
  "version": 2,
  "builds": [
    {
      "src": "./index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/"
    }
  ],
  "env": {
    "DB_USER": "@db-user",
    "DB_PASS": "@db-pass"
  }
}
```

### Deployment Steps

1. **Install Vercel CLI**

   ```bash
   npm i -g vercel
   ```

2. **Deploy to Vercel**

   ```bash
   vercel --prod
   ```

3. **Set Environment Variables**
   ```bash
   vercel env add DB_USER
   vercel env add DB_PASS
   vercel env add MONGODB_URI
   ```

---

## 🧪 Testing

### API Testing with curl

```bash
# Test products endpoint
curl -X GET http://localhost:8000/api/products

# Test with JSON data
curl -X POST http://localhost:8000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'
```

### Testing Tools (Recommended)

- **Postman**: API endpoint testing
- **Jest**: Unit testing framework
- **Supertest**: HTTP assertion library
- **MongoDB Memory Server**: In-memory database for testing

---

## 🔄 Development Workflow

### Available Scripts

```bash
npm start        # Start production server
npm run dev      # Start development server with nodemon
npm test         # Run tests (to be implemented)
npm run lint     # Code linting (to be implemented)
```

### Development Guidelines

1. Follow RESTful API conventions
2. Use async/await for database operations
3. Implement proper error handling
4. Validate input data
5. Use environment variables for configuration

---

## 📊 Database Collections

### Products Collection Sample

```json
{
  "_id": "64f1a2b3c4d5e6f7g8h9i0j1",
  "name": "Haylou Solar Pulse RT3",
  "price": 48.79,
  "rating": 5,
  "availability": "In stock",
  "image": "/images/haylou-rt3.jpg",
  "description": "Advanced smartwatch with AMOLED display",
  "features": [
    "Bluetooth 5.2",
    "1.47\" AMOLED display",
    "Secure communication",
    "Multi-sport tracking"
  ],
  "category": "smartwatch",
  "brand": "Haylou",
  "createdAt": "2024-01-15T10:00:00.000Z"
}
```

---

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Errors**

   ```bash
   # Check MongoDB URI format
   echo $MONGODB_URI

   # Test connection
   mongosh "mongodb+srv://username:password@cluster.mongodb.net/technet"
   ```

2. **CORS Issues**

   ```javascript
   // Verify CORS origins match your frontend URL
   const corsOptions = {
     origin: ["https://awesometechnet.netlify.app"],
   };
   ```

3. **Environment Variables**
   ```bash
   # Check if .env file is loaded
   console.log(process.env.DB_USER); // Should not be undefined
   ```

---

## 🔮 Future Enhancements

- 🔐 **JWT Authentication**: Complete user authentication system
- 📧 **Email Service**: Order confirmations and notifications
- 💳 **Payment Integration**: Stripe/PayPal payment processing
- 📊 **Analytics**: API usage monitoring and analytics
- 🔍 **Search**: Advanced product search with MongoDB text search
- 📱 **Push Notifications**: Real-time order updates
- 🧪 **Testing Suite**: Comprehensive API testing
- 📝 **API Documentation**: Swagger/OpenAPI documentation
- 🚀 **Caching**: Redis caching for improved performance
- 🔒 **Rate Limiting**: API rate limiting and security

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📞 Support & Contact

### 🛟 API Support

- **GitHub Issues**: [Report API bugs](https://github.com/yourusername/technet-server/issues)
- **API Documentation**: Comprehensive endpoint documentation
- **Developer Discord**: Backend development community

### 📧 Contact Information

- **Technical Support**: api-support@technet-store.com
- **Documentation**: docs@technet-store.com

---

## 🙏 Acknowledgments

- **Express.js Team** for the excellent web framework
- **MongoDB Team** for the powerful database solution
- **Node.js Community** for the robust runtime environment
- **Vercel** for seamless serverless deployment
- **Open Source Community** for inspiration and support

---

**Powering the Future of E-commerce with Robust Backend Technology! 🚀⚡**

_Tech Net Server - Where performance meets reliability in modern e-commerce backend architecture._
