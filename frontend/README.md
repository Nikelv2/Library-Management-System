# LibryFlow Frontend

React frontend for the LibryFlow Library Management System.

## Features

- User authentication (Login/Register)
- Book browsing and management
- Loan management (Borrow/Return)
- Role-based access control (Member/Librarian)
- Responsive design

## Development

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. The app will be available at http://localhost:3000

### Environment Variables

Create a `.env` file in the frontend directory:

```
VITE_API_URL=http://localhost:8000
```

## Docker

The frontend is included in the main docker-compose.yml file. To run with Docker:

```bash
docker-compose up --build
```

The frontend will be available at http://localhost:3000
