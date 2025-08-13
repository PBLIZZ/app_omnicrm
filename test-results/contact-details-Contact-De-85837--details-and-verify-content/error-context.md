# Page snapshot

```yaml
- region "Notifications alt+T"
- dialog "Add New Contact":
    - heading "Add New Contact" [level=2]
    - paragraph: Create a new contact. Only the name is required.
    - text: Full Name *
    - textbox "Full Name *": John Doe
    - text: Email
    - textbox "Email": john@example.com
    - text: Phone
    - textbox "Phone": "+1234567890"
    - text: Tags
    - textbox "Tags"
    - paragraph: Separate tags with commas
    - text: Notes
    - textbox "Notes"
    - button "Cancel"
    - button "Create Contact"
    - button "Close"
```
