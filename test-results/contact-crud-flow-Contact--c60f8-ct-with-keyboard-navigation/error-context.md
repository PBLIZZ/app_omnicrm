# Page snapshot

```yaml
- region "Notifications alt+T"
- dialog "Add New Contact":
    - heading "Add New Contact" [level=2]
    - paragraph: Create a new contact. Only the name is required.
    - text: Full Name *
    - textbox "Full Name *"
    - text: Email
    - textbox "Email": Test User
    - text: Phone
    - textbox "Phone": test@example.com
    - text: Tags
    - textbox "Tags"
    - paragraph: Separate tags with commas
    - text: Notes
    - textbox "Notes"
    - button "Cancel"
    - button "Create Contact" [disabled]
    - button "Close"
```
