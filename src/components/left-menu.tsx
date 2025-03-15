import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';

// Define menu items
const menuItems = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Merchants', path: '/merchants' },
  { name: 'Customers', path: '/customers' },
  { name: 'Campaigns', path: '/campaigns' },
  { name: 'Settings', path: '/settings' },
  { name: 'API Key Test', path: '/api-key-test' },
];

// Admin-only menu items
const adminMenuItems = [
  { name: 'API Key Test', path: '/api-key-test' },
];

export default function LeftMenu() {
  const pathname = usePathname();
  const { user, userClaims } = useAuth();
  const isAdmin = userClaims?.admin === true;

  return (
    <div className="w-64 bg-white shadow-md h-full">
      <div className="p-4">
        <h2 className="text-xl mb-6">
          <span className="font-bold">Tap</span>{" "}
          <span className="font-normal">Loyalty</span>
        </h2>
        <nav>
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.path}>
                <Link
                  href={item.path}
                  className={cn(
                    "block px-4 py-2 rounded-md transition-colors",
                    pathname === item.path
                      ? "bg-blue-100 text-blue-700"
                      : "hover:bg-gray-100"
                  )}
                >
                  {item.name}
                </Link>
              </li>
            ))}
            
            {/* Admin-only menu items */}
            {isAdmin && (
              <>
                <li className="pt-4 pb-2">
                  <div className="text-xs uppercase text-gray-500 font-semibold px-4">Admin</div>
                </li>
                {adminMenuItems.map((item) => (
                  <li key={item.path}>
                    <Link
                      href={item.path}
                      className={cn(
                        "block px-4 py-2 rounded-md transition-colors",
                        pathname === item.path
                          ? "bg-purple-100 text-purple-700"
                          : "hover:bg-gray-100"
                      )}
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </>
            )}
          </ul>
        </nav>
      </div>
    </div>
  );
} 