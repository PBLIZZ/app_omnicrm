# Page snapshot

```yaml
- region "Notifications alt+T":
    - list:
        - listitem:
            - img
            - text: Contact created Alice Johnson has been added.
- dialog "Add New Contact":
    - heading "Add New Contact" [level=2]
    - paragraph: Create a new contact. Only the name is required.
    - text: Full Name *
    - textbox "Full Name *": Alice Johnson
    - text: Email
    - textbox "Email": alice@company.com
    - text: Phone
    - textbox "Phone"
    - text: Tags
    - textbox "Tags"
    - paragraph: Separate tags with commas
    - text: Notes
    - textbox "Notes"
    - button "Cancel" [disabled]
    - button "Created!" [disabled]:
        - img
        - text: Created!
    - button "Close"
```
