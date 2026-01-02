# Conversation Allocation System - Frontend

Beautiful, modern React + TypeScript UI for the Conversation Allocation System.

## Features

✨ **Modern UI/UX**
- Clean, professional design with Tailwind CSS
- Responsive layout (mobile, tablet, desktop)
- Real-time updates
- Smooth animations and transitions

🎯 **Core Functionality**
- Login with operator ID (1-4)
- Dashboard with live statistics
- Auto-allocate conversations based on priority
- View conversations by state (QUEUED, ALLOCATED, RESOLVED)
- Resolve conversations
- Toggle operator status (AVAILABLE/OFFLINE)
- View subscribed inboxes

🛡️ **Robust Error Handling**
- Comprehensive try-catch blocks
- User-friendly error messages
- Loading states for all async operations
- Toast notifications for feedback

## Quick Start

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

The UI will be available at: **http://localhost:5173**

### 3. Login

Use one of these test operator IDs:
- **1** - John Doe (Operator)
- **2** - Jane Smith (Operator)
- **3** - Mike Manager (Manager)
- **4** - Alice Admin (Admin)

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool & dev server
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **Axios** - HTTP client
- **Lucide React** - Icons
- **React Hot Toast** - Notifications
- **date-fns** - Date formatting

## Project Structure

```
frontend/
├── src/
│   ├── api/              # API client & endpoints
│   │   ├── client.ts     # Axios instance
│   │   ├── conversations.ts
│   │   └── operators.ts
│   ├── components/       # React components
│   │   ├── Header.tsx
│   │   ├── Dashboard.tsx
│   │   ├── ConversationList.tsx
│   │   ├── OperatorPanel.tsx
│   │   └── LoginModal.tsx
│   ├── store/            # State management
│   │   └── useStore.ts   # Zustand store
│   ├── App.tsx           # Main app component
│   ├── main.tsx          # Entry point
│   └── index.css         # Global styles
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## Features in Detail

### Dashboard
- Active conversations count
- Queued conversations count
- Resolved today count
- Average resolution time

### Conversation List
- Filter by state (QUEUED, ALLOCATED, RESOLVED)
- Auto-allocate button for QUEUED conversations
- Priority score display
- Resolve button for allocated conversations
- Real-time updates

### Operator Panel
- Status toggle (AVAILABLE/OFFLINE)
- Subscribed inboxes list
- Grace period warning
- Quick actions

## API Integration

The frontend automatically proxies API requests to the backend:

```typescript
// vite.config.ts
proxy: {
  '/api': {
    target: 'http://localhost:3000',
    changeOrigin: true,
  },
}
```

All API calls go through `/api/v1/*` and are forwarded to the backend.

## Error Handling

Every API call is wrapped with try-catch:

```typescript
try {
  const response = await conversationsAPI.allocate(operatorId)
  toast.success('Success!')
} catch (error: any) {
  console.error('Error:', error)
  toast.error(error.response?.data?.message || 'Failed')
}
```

## Building for Production

```bash
npm run build
```

Output will be in `dist/` folder.

### Preview Production Build

```bash
npm run preview
```

## Environment Variables

No environment variables needed! The frontend uses Vite's proxy for API calls.

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Troubleshooting

### Port 5173 already in use
```bash
# Change port in vite.config.ts
server: {
  port: 5174,
}
```

### API calls failing
1. Ensure backend is running on port 3000
2. Check browser console for errors
3. Verify operator ID is valid (1-4)

### Build errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Development Tips

### Hot Reload
Changes to `.tsx` and `.css` files trigger instant hot reload.

### TypeScript
Full type safety with TypeScript. Check types:
```bash
npm run build
```

### Linting
```bash
npm run lint
```

## Contributing

The UI is production-ready with:
- ✅ Full error handling
- ✅ Loading states
- ✅ User feedback (toasts)
- ✅ Responsive design
- ✅ Type safety
- ✅ Clean code structure

---

**Built with ❤️ using React + TypeScript + Tailwind CSS**
