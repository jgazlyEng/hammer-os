# GreenLight User Function Walkthrough

Version: MVP Production Guide

GreenLight is an internal studio development platform for receiving scripts, organizing project materials, collaborating on notes, tracking tasks, and giving executives a clear view of what needs attention. The first phase of the product is intentionally focused: capture scripts and supporting context, attach them to projects, review them, break them down, and keep the right people aligned.

## Core Concepts

### Projects

Projects are the central workspace for an active title or development opportunity. A project brings together scripts, treatments, supporting documentation, reference images, status, and tasks.

Use Projects when you want to answer:

- What is this project?
- What scripts or supporting documents are attached?
- What does the artist or producer need to start work?
- What tasks are open?
- What is the current status?

### Scripts

Scripts are the primary creative documents in GreenLight. A script can start in Incoming Scripts before it is assigned to a project, or it can live directly under an active project.

Use Scripts when you want to:

- Upload a new script, treatment, outline, coverage, deck, or notes file.
- Add a writer name.
- Assign or reassign the document to a project.
- Upload a new version.
- Compare text changes between versions.
- Run a breakdown to identify scenes, characters, locations, props, and action moments.

### Supporting Documents

Supporting documents are contextual files attached to a script or project. Examples include creative context, director notes, producer notes, research material, pitch documents, and coverage.

Use supporting documents when the script needs extra context before someone reviews, approves, or works from it.

### Tasks

Tasks are assignments tied to users and projects. Standard users see their own assigned tasks. Admins, producers, and executives can see all tasks.

Use Tasks when you need to:

- Assign work to a person.
- Track priority and progress.
- Connect a task to a project, script, asset, or slate item.
- Give executives a quick view of what must happen this week.

### Contacts CRM

Contacts is a lightweight collaborative CRM for studio relationships. It tracks writers, producers, artists, agencies, managers, vendors, and other collaborators.

Use Contacts when you need to:

- Look up a person or company.
- Track relationship status, owner, tags, notes, and follow-up dates.
- Link contacts to projects, scripts, and follow-up tasks.
- Import or export contact data by CSV.

### Development Slate

The Development Slate is a searchable and filterable table for broader project opportunities and incoming tracked material. It can be manually updated or imported from CSV.

Use Development Slate when you want a producer or executive to quickly browse opportunities by genre, lane, format, owner, status, rights, next step, or other tracking columns.

## Role-Based Access

GreenLight uses role-based access so users only see the areas relevant to their work.

### Admin

Admins can see and manage the entire system. They can create users, assign roles, create projects, delete projects, delete tasks, manage project status, and access all scripts, contacts, and executive views.

### Executive

Executives can see all projects, all scripts, incoming scripts, the executive dashboard, contacts, and high-level task/status views.

### Producer

Producers can see all scripts, incoming scripts, contacts, projects, and tasks. They are the primary users for assigning scripts, creating tasks, and managing development workflow.

### Artist

Artists see projects they are assigned to and the scripts, references, and tasks needed for their work. They should not see unrelated incoming scripts, contacts, or admin tools.

### Standard User

Standard users see the projects and tasks assigned to them. They do not see admin, executive, or manager-only areas unless their role allows it.

## Navigation Overview

The left navigation is the main way to move through GreenLight:

- Dashboard: personal or role-aware home base.
- Projects: active projects and development slate.
- Scripts: incoming scripts and project scripts.
- Tasks: assignments and slate tasks.
- Contacts: collaborative CRM for producers, executives, and admins.
- Executive: executive-only project status view.
- Admin: admin-only user, role, and project management.
- Account: update personal details and password.

## Dashboard

The Dashboard is the logged-in user's home base.

### What It Shows

- Tasks assigned to the logged-in user.
- For admins, producers, and executives, broader task visibility.
- Scripts that need attention.
- Recently received script activity.
- Quick links into scripts, tasks, and project work.

### How To Use It

1. Log in.
2. Start on Dashboard.
3. Review your assigned tasks.
4. Click a task to open the task page with that task selected.
5. Open scripts that need review from the dashboard cards.
6. Move into Projects or Scripts when you need more detail.

## Projects

Projects is split into Active Projects and Development Slate.

### Active Projects

Active Projects are real working project spaces.

Each project page includes:

- Associated scripts.
- Supporting documents.
- Reference images.
- Status.
- Tasks.
- Artist-facing assignments and working brief.

### How To Open A Project

1. Go to Projects.
2. Choose Active Projects.
3. Click the project row or project title.
4. Review the project overview.
5. Use the project page to access scripts, supporting docs, reference images, and tasks.

### How To Add Reference Images

1. Open a project.
2. Go to the Reference Images area.
3. Upload the image.
4. Add a title or description if needed.
5. The image becomes part of the project packet for artists and reviewers.

### How To Add Supporting Documentation

1. Open the project or script.
2. Go to the documents or script packet area.
3. Upload the supporting file.
4. Choose the document type.
5. Add notes if helpful.
6. Save the upload.

## Development Slate

Development Slate is a producer/executive tracking list for broader opportunities.

### What It Does

- Stores project leads and tracked opportunities.
- Lets users filter by type, lane, genre, owner, rights, urgency, format, script status, and next action.
- Supports manual creation of slate items.
- Supports CSV import from systems like Airtable.
- Skips existing imported entries and only adds new rows.

### How To Add A Slate Item

1. Go to Projects.
2. Select Development Slate.
3. Click Add Slate.
4. Fill in the available fields, including title, creator, genre, lane, owner, next action, script status, format, logline, and notes.
5. Click Add Slate.
6. The new slate item appears in the slate table.

### How To Import A Slate CSV

1. Go to Projects.
2. Select Development Slate.
3. Click Import CSV.
4. Choose the CSV export file.
5. GreenLight processes the rows.
6. Existing rows with matching IDs are ignored.
7. New rows are added to the Development Slate.

### How To Review A Slate Item

1. Go to Development Slate.
2. Use search or filters to narrow the table.
3. Click a slate row.
4. Review the overlay details.
5. Update status, owner, next action, or notes.
6. Save changes.

## Scripts

Scripts is the central script library.

### Script Sections

Incoming Scripts:

- Unassigned scripts, specs, treatments, or submissions.
- Visible to admins, producers, and executives.

Active Project Scripts:

- Scripts already attached to projects.
- Visible based on role and project access.

### How To Upload A Script

1. Go to Scripts.
2. Use the upload area.
3. Choose the document type, such as Script, Treatment, Outline, Coverage, Notes, or Business Document.
4. Add the title.
5. Add the writer name.
6. Choose a project if the script already belongs to one, or leave it unassigned if it should enter Incoming Scripts.
7. Upload the file.
8. The document appears in the correct script section.

### How To Assign Or Reassign A Script To A Project

1. Go to Scripts.
2. Find the script row.
3. Use the project dropdown.
4. Select the correct project.
5. Click Assign or Move.
6. The script updates in the database and appears under that project.

### How To Open A Script

1. Go to Scripts.
2. Click the script title.
3. Review readable text, current decision/status, file packet, versions, and breakdown options.

### How To Change Script Status

1. Open the script detail page.
2. Find Current Decision or status controls.
3. Choose the new status.
4. Save or confirm the change.
5. The updated status appears across the script library and related views.

## Script Versions And Comparison

Version tracking helps compare script drafts over time.

### How To Upload A New Version

1. Open a script.
2. Go to Versions.
3. Click Upload New Version.
4. Choose the file.
5. Add notes describing the change.
6. Upload the new version.
7. GreenLight stores it as the next version.

### How To Compare Versions

1. Open a script.
2. Go to Versions.
3. Use Version Comparison.
4. Choose Version A and Version B.
5. Review the summary of added and removed text.
6. Use the side-by-side comparison to understand what changed.

## Script Breakdown

Script Breakdown turns script text into editable production intelligence.

### What It Detects

- Scene headings.
- Scene numbers or order.
- Locations.
- Time of day.
- Characters.
- Props.
- Action moments.
- Other detected entities.

The MVP uses deterministic parsing, not required AI. It looks for screenplay patterns such as INT., EXT., and INT/EXT., and then extracts likely scene and entity information.

### How To Run A Breakdown

1. Open a script.
2. Go to Breakdown.
3. Click Run Breakdown.
4. Review the generated scenes and entities.
5. Edit any incorrect fields manually.
6. Delete incorrect detected entities when needed.
7. Click Approve Breakdown when the breakdown is ready to use.

### How Artists Use Breakdown

Artists can use breakdown records to understand locations, characters, props, and action moments needed for visual development or pre-viz.

## Tasks

Tasks are assignments tied to people and projects.

### What Tasks Include

- Project.
- Task name.
- Description.
- Assigned user.
- Priority.
- Progress/status.
- Optional linked target, such as project, script, asset, scene, or slate item.

### How To Create A Task

1. Go to Tasks or open a project.
2. Click New Task.
3. Choose the project.
4. Enter the task name.
5. Add a description.
6. Assign the task to a user.
7. Choose priority: Low, Medium, High, or Urgent.
8. Choose progress: To Do, In Progress, Complete, On Hold, or Review.
9. Save the task.

### How To Update A Task

1. Go to Tasks.
2. Find the task.
3. Change priority or progress directly from the task table.
4. The update is saved to the database.

### Task Visibility

- Regular users see their assigned tasks.
- Admins, producers, and executives see all tasks.

## Contacts CRM

Contacts helps track people and companies connected to the studio pipeline.

### What Contacts Track

- Name.
- Company.
- Role or type.
- Email and phone.
- Owner.
- Status.
- Tags.
- Last contacted date.
- Next follow-up date.
- Notes.
- Linked projects.
- Linked scripts.
- Related follow-up tasks.

### How To Search Contacts

1. Go to Contacts.
2. Use the search bar.
3. Filter by type, owner, status, or tags.
4. Click a contact to review relationship details.

### How To Update A Contact

1. Open Contacts.
2. Select a contact.
3. Update status, owner, tags, linked projects, follow-up date, or notes.
4. Click Save Relationship.

### How To Delete A Contact

1. Open Contacts.
2. Select the contact.
3. Click Delete Contact.
4. Confirm the deletion.
5. The contact is removed from active views.

### How To Import Contacts

1. Go to Contacts.
2. Click Import CSV.
3. Choose the CSV file.
4. Review the import message.
5. Contacts are added to the CRM.

### How To Export Contacts

1. Go to Contacts.
2. Click Export CSV.
3. GreenLight downloads the contact list as a CSV file.

## Executive Page

The Executive page is designed as a clear status update view.

### What It Shows

- Projects needing executive attention.
- Project health and status.
- Scripts awaiting review.
- Task to-do list for the week.
- Items needing follow-up.
- Greenlight candidates.
- Project slate summaries.

### How Executives Use It

1. Go to Executive.
2. Review the top-level status cards.
3. Open any project, script, or task that needs attention.
4. Use the task list to see what needs to happen this week.
5. Use greenlight candidates and risk/follow-up sections to prioritize decisions.

## Admin

Admin is for system and workflow management.

### What Admins Can Do

- Create users.
- Assign user roles.
- Generate temporary passwords for new users.
- Create projects.
- Delete projects.
- Delete tasks.
- Manage project status.
- Review users and project access.

### How To Create A User

1. Go to Admin.
2. Click Create User.
3. Enter the user's name and email.
4. Choose the user's role.
5. Create the user.
6. GreenLight displays a temporary password.
7. Send the login details to the user.
8. The user can later change their password in Account.

### How To Delete A Project

1. Go to Admin.
2. Find the project management section.
3. Choose the project.
4. Click Delete.
5. Confirm the deletion.
6. The project is soft-deleted and removed from active views.

## Account

Account lets each user manage their own profile.

### What Users Can Update

- Name.
- Email.
- Password.

### How To Change Password

1. Go to Account.
2. Enter your current password.
3. Enter the new password.
4. Save the account.
5. Sign out and sign back in if the email was changed.

## Recommended Daily Workflow

### Producer Workflow

1. Start on Dashboard.
2. Review tasks and scripts needing attention.
3. Go to Scripts.
4. Review Incoming Scripts.
5. Assign scripts to projects when they are ready.
6. Upload supporting documents or context.
7. Create tasks for writers, artists, or reviewers.
8. Update the Development Slate as new opportunities arrive.
9. Use Contacts to track reps, writers, agencies, and follow-ups.

### Executive Workflow

1. Start on Executive.
2. Review projects needing attention.
3. Open scripts awaiting review.
4. Check weekly task list.
5. Review greenlight candidates.
6. Add notes, decisions, or follow-up tasks.

### Artist Workflow

1. Start on Dashboard.
2. Review assigned tasks.
3. Open assigned project.
4. Review Artist Start Here.
5. Open scripts, supporting documents, reference images, and breakdown records.
6. Complete or update task progress as work moves forward.

### Admin Workflow

1. Create or update users.
2. Assign roles.
3. Create projects.
4. Confirm project access.
5. Remove old or incorrect records when needed.
6. Monitor that production data is connected and updating correctly.

## Data And Production Notes

GreenLight stores application records in PostgreSQL through Prisma. In production mode, changes made through the app write to the production database.

Database-backed actions include:

- Creating users.
- Updating account details.
- Creating, deleting, and updating projects.
- Uploading and assigning scripts.
- Uploading new script versions.
- Updating script status.
- Adding and importing slate items.
- Creating, updating, and deleting tasks.
- Importing, updating, exporting, and deleting contacts.
- Uploading supporting documents and reference images.

Uploaded files are represented by metadata in the database. File-backed storage can be connected to Google Cloud Storage for production use.

## MVP Boundaries

GreenLight is intentionally focused for the first phase.

Included in the MVP:

- Script intake.
- Project organization.
- Supporting documentation.
- Notes and collaboration areas.
- Version tracking and comparison.
- Script breakdown.
- Task assignment.
- Contacts CRM.
- Development slate.
- Admin user management.
- Executive status view.

Not included yet:

- Public external script sharing.
- AI image generation.
- Full production scheduling.
- Accounting or payroll.
- Full Google OAuth flow.
- Final enterprise-grade permission edge cases.

## Best Practices

- Keep Incoming Scripts clean by assigning viable scripts to projects.
- Use project pages as the artist-facing source of truth.
- Add supporting documentation whenever a script needs context.
- Use tasks for specific next actions, not general notes.
- Keep contact follow-up dates current.
- Import slate CSVs regularly when using Airtable or an outside tracker.
- Use Account to change temporary passwords after first login.

## Quick Reference

Dashboard:
See your work and what needs attention.

Projects:
Open active projects and review the development slate.

Scripts:
Upload, assign, review, version, compare, and break down scripts.

Tasks:
Create and update assignments.

Contacts:
Manage collaborators, companies, reps, agencies, and follow-ups.

Executive:
Review project health, decisions, weekly work, and greenlight candidates.

Admin:
Manage users, roles, projects, and system-level records.

Account:
Update personal details and password.

