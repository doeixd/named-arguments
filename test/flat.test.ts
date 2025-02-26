it('should handle optional properties correctly', () => {
    // Function with optional properties
    function createProfile(
      username: string,
      profile: {
        fullName: string;
        bio?: string;
        age?: number;
        contact?: {
          email?: string;
          phone?: string;
        };
      }
    ) {
      return {
        username,
        ...profile
      };
    }

    // Create named arguments with optional properties
    const [args, namedCreateProfile] = createNamedArguments<{
      username: string;
      fullName: string;
      bio?: string;
      age?: number;
      email?: string;
      phone?: string;
    }, typeof createProfile>(createProfile);

    // Test with some optional properties
    const profile1 = namedCreateProfile(
      args.username('jdoe'),
      args.fullName('John Doe'),
      args.bio('Software developer')
      // Omit age, email and phone
    );

    expect(profile1).toEqual({
      username: 'jdoe',
      fullName: 'John Doe',
      bio: 'Software developer'
    });

    // Test with different optional properties
    const profile2 = namedCreateProfile(
      args.username('asmith'),
      args.fullName('Alice Smith'),
      // Omit bio
      args.age(28),
      args.email('alice@example.com')
      // Omit phone
    );

    expect(profile2).toEqual({
      username: 'asmith',
      fullName: 'Alice Smith',
      age: 28,
      contact: {
        email: 'alice@example.com'
      }
    });
    
    // Test TypeScript error prevention
    // This should not cause a TypeScript error - all properties are available
    // even though some are optional in the original type
    const testOptionalAccess = args.email;
    expect(typeof testOptionalAccess).toBe('function');
  });import { describe, it, expect } from 'vitest';
import {
  createNamedArguments,
  createConfigurableFunction
} from '../src/index';

describe('Flattened Object Parameters', () => {
  it('should support flattened object parameters', () => {
    // Function with an options object parameter
    function createUser(
      name: string, 
      options: { 
        age: number, 
        email?: string,
        address?: {
          city: string,
          country?: string
        }
      }
    ) {
      return {
        name,
        age: options.age,
        email: options.email,
        city: options.address?.city,
        country: options.address?.country
      };
    }

    // Create named arguments with flattened parameter structure
    const [args, namedCreateUser] = createNamedArguments<
      {
        name: string,
        age: number,  // These were properties of the options object
        email?: string,
        city?: string,
        country?: string
      },
      typeof createUser
    >(createUser);

    // Use flattened named arguments
    const user = namedCreateUser(
      args.name('John'),
      args.age(30),
      args.email('john@example.com'),
      args.city('New York'),
      args.country('USA')
    );

    expect(user).toEqual({
      name: 'John',
      age: 30,
      email: 'john@example.com',
      city: 'New York',
      country: 'USA'
    });
  });

  it('should support dot notation for nested properties', () => {
    // Function with nested object parameters
    function configureApp(options: {
      server: {
        port: number;
        host?: string;
      };
      database: {
        url: string;
        username: string;
        password: string;
      };
    }) {
      return {
        serverConfig: options.server,
        dbConfig: options.database
      };
    }

    // Create named arguments
    const [args, namedConfigureApp] = createNamedArguments<
      {
        'server.port': number;
        'server.host'?: string;
        'database.url': string;
        'database.username': string;
        'database.password': string;
      },
      typeof configureApp
    >(configureApp);

    // Use dot notation for nested properties
    const config = namedConfigureApp(
      args['server.port'](8080),
      args['server.host']('localhost'),
      args['database.url']('mongodb://localhost:27017'),
      args['database.username']('admin'),
      args['database.password']('password123')
    );

    expect(config).toEqual({
      serverConfig: {
        port: 8080,
        host: 'localhost'
      },
      dbConfig: {
        url: 'mongodb://localhost:27017',
        username: 'admin',
        password: 'password123'
      }
    });
  });

  it('should support direct and flattened parameter combinations', () => {
    // Function with mixed parameter types
    function renderComponent(
      id: string,
      content: string,
      style: {
        width: number,
        height: number,
        color?: string
      },
      options?: {
        animate: boolean,
        duration?: number
      }
    ) {
      return {
        id,
        content,
        style,
        options: options || { animate: false }
      };
    }

    // Create named arguments with mixed flattening
    const [args, namedRender] = createNamedArguments<
      {
        id: string,
        content: string,
        width: number,
        height: number,
        color?: string,
        animate?: boolean,
        duration?: number
      },
      typeof renderComponent
    >(renderComponent);

    // Use direct and flattened parameters
    const component = namedRender(
      args.id('header'),
      args.content('Welcome'),
      args.width(1000),
      args.height(200),
      args.color('blue'),
      args.animate(true),
      args.duration(500)
    );

    expect(component).toEqual({
      id: 'header',
      content: 'Welcome',
      style: {
        width: 1000,
        height: 200,
        color: 'blue'
      },
      options: {
        animate: true,
        duration: 500
      }
    });
  });

  it('should work with configurable functions', () => {
    // Function with options object
    function fetchData(
      url: string,
      options: {
        method: 'GET' | 'POST' | 'PUT' | 'DELETE',
        headers?: Record<string, string>,
        body?: object,
        timeout?: number
      }
    ) {
      return { url, ...options };
    }

    // Create named arguments with flattened options
    const [args, namedFetch] = createNamedArguments<
      {
        url: string,
        method: 'GET' | 'POST' | 'PUT' | 'DELETE',
        headers?: Record<string, string>,
        body?: object,
        timeout?: number
      },
      typeof fetchData
    >(fetchData);

    // Create configurable function
    const configurableFetch = createConfigurableFunction([args, namedFetch]);

    // Configure a GET request with standard headers
    const getJSON = configurableFetch<'method' | 'headers' | 'timeout'>(args => {
      args.method('GET');
      args.headers({
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      });
      args.timeout(5000);
    });

    // Use the configured function with just the URL
    const request = getJSON(args.url('https://api.example.com/data'));

    expect(request).toEqual({
      url: 'https://api.example.com/data',
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });
  });
});