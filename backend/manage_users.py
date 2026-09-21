import sys
import os
import argparse
import getpass

# Ensure project root is in sys.path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.services.db_service import DatabaseService, init_db

def cmd_create(args):
    init_db()
    email = args.email
    if not email:
        email = input("Enter user email: ").strip()
    if not email or "@" not in email:
        print("Error: A valid email address is required.")
        sys.exit(1)
    
    existing = DatabaseService.get_user_by_email(email)
    if existing:
        print(f"Error: A user with email '{email}' already exists.")
        sys.exit(1)

    name = args.name
    if not name:
        name = input("Enter user full name: ").strip()
    if not name:
        name = "Cadastral Surveyor"

    password = args.password
    if not password:
        password = getpass.getpass("Enter user password: ")
        confirm = getpass.getpass("Confirm password: ")
        if password != confirm:
            print("Error: Passwords do not match.")
            sys.exit(1)

    if len(password) < 6:
        print("Error: Password must be at least 6 characters.")
        sys.exit(1)

    role = args.role or "Cadastral Surveyor"
    user = DatabaseService.create_user(
        email=email,
        password=password,
        name=name,
        role=role,
        is_active=1
    )
    print(f"Successfully created user '{user['email']}' (ID: {user['id']}, Role: {user['role']}).")

def cmd_list(args):
    init_db()
    users = DatabaseService.list_users()
    if not users:
        print("No users found in database.")
        return
    print(f"\n{'ID':<18} | {'Email':<30} | {'Name':<22} | {'Role':<22} | {'Active':<8}")
    print("-" * 110)
    for u in users:
        status_str = "Yes" if u.get("is_active", 1) else "No"
        print(f"{u['id']:<18} | {u['email']:<30} | {u['name']:<22} | {u.get('role', 'Surveyor'):<22} | {status_str:<8}")
    print()

def cmd_set_password(args):
    init_db()
    email = args.email
    if not email:
        email = input("Enter user email: ").strip()
    user = DatabaseService.get_user_by_email(email)
    if not user:
        print(f"Error: User with email '{email}' not found.")
        sys.exit(1)

    password = args.password
    if not password:
        password = getpass.getpass("Enter new password: ")
        confirm = getpass.getpass("Confirm new password: ")
        if password != confirm:
            print("Error: Passwords do not match.")
            sys.exit(1)

    if len(password) < 6:
        print("Error: Password must be at least 6 characters.")
        sys.exit(1)

    DatabaseService.update_user_password(email, password)
    print(f"Successfully updated password for '{email}'.")

def cmd_deactivate(args):
    init_db()
    email = args.email or input("Enter user email to deactivate: ").strip()
    if DatabaseService.set_user_active_status(email, 0):
        print(f"User '{email}' has been deactivated.")
    else:
        print(f"Error: User '{email}' not found.")

def cmd_activate(args):
    init_db()
    email = args.email or input("Enter user email to activate: ").strip()
    if DatabaseService.set_user_active_status(email, 1):
        print(f"User '{email}' has been activated.")
    else:
        print(f"Error: User '{email}' not found.")

def main():
    parser = argparse.ArgumentParser(description="UrbanCadastral AI User Management Tool")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # create
    p_create = subparsers.add_parser("create", help="Create a new user")
    p_create.add_argument("--email", help="User email address")
    p_create.add_argument("--name", help="User display name")
    p_create.add_argument("--password", help="User password")
    p_create.add_argument("--role", default="Cadastral Surveyor", help="User role")

    # list
    subparsers.add_parser("list", help="List all users")

    # set-password
    p_pwd = subparsers.add_parser("set-password", help="Update user password")
    p_pwd.add_argument("--email", help="User email address")
    p_pwd.add_argument("--password", help="New password")

    # deactivate
    p_deact = subparsers.add_parser("deactivate", help="Deactivate user account")
    p_deact.add_argument("--email", help="User email address")

    # activate
    p_act = subparsers.add_parser("activate", help="Activate user account")
    p_act.add_argument("--email", help="User email address")

    args = parser.parse_args()
    if args.command == "create":
        cmd_create(args)
    elif args.command == "list":
        cmd_list(args)
    elif args.command == "set-password":
        cmd_set_password(args)
    elif args.command == "deactivate":
        cmd_deactivate(args)
    elif args.command == "activate":
        cmd_activate(args)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
