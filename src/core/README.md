# Clean Code Architecture (Onion Architecture)

This directory contains the implementation of the Clean Code Architecture (Onion Architecture) for the WMS application.

## Directory Structure

```
src/core/
│
├── domain/             # Core domain layer (entities and interfaces)
│   ├── entities/       # Business entities/models
│   ├── repositories/   # Repository interfaces
│   └── services/       # Service interfaces
│
├── application/        # Application layer
│   ├── dtos/           # Data Transfer Objects
│   └── services/       # Service implementations
│
├── infrastructure/     # Infrastructure layer
│   ├── api/            # HTTP client (axios)
│   ├── repositories/   # Repository implementations
│   └── di/             # Dependency injection container
│
└── presentation/       # Presentation layer
    └── hooks/          # React hooks for UI
```

## Usage

### Dependency Injection

The dependency injection container manages the instantiation of services and repositories. You can access it like this:

```typescript
import container from "@/core/infrastructure/di/container";

// Get a service
const authService = container.resolve("authService");

// Get a repository
const userRepository = container.resolve("userRepository");
```

### Using Hooks in Components

The architecture provides React hooks that you can use in your components:

```typescript
import { useAuth } from "@/core/presentation/hooks/useAuth";

function MyComponent() {
  const { user, login, logout, isAuthenticated } = useAuth();

  // Use the auth functionality
}
```

### Adding New Features

To add a new feature, follow these steps:

1. Add domain entities and interfaces in the `domain` directory
2. Create DTOs in the `application/dtos` directory
3. Implement service in the `application/services` directory
4. Add repository implementation in the `infrastructure/repositories` directory
5. Register your services and repositories in the `infrastructure/di/container.ts` file
6. Create React hooks in the `presentation/hooks` directory

### API vs Local Storage

The architecture supports both API and local storage implementations. You can configure which one to use with the environment variable `VITE_USE_LOCAL_STORAGE`.

## Testing

When testing components that use our hooks, you can provide mock implementations:

```typescript
import { AuthProvider } from "@/core/presentation/hooks/useAuth";
import { render } from "@testing-library/react";

// Mock auth service
const mockAuthService = {
  login: jest.fn(),
  logout: jest.fn(),
  // ...other methods
};

// Render component with mock service
render(
  <AuthProvider service={mockAuthService}>
    <YourComponent />
  </AuthProvider>
);
```
