# Quick Reference Guide - Smart Classroom Scheduler

## 🚀 Start Application
```bash
node app.js
```
Then open: http://localhost:3000

---

## 🔑 Login Credentials

### Admin Account
- **Email:** admin@edusmart.edu
- **Password:** admin123

### Teacher Account  
- **Email:** teacher@edusmart.edu
- **Password:** teacher123

---

## 📱 Navigation Structure

```
Login → Dashboard
         ├─ Teachers (Add/View/Delete)
         ├─ Courses (Add/View/Delete)
         ├─ Classrooms (Add/View/Delete)
         └─ Timetable (Add/View/Delete)
```

---

## ✅ Feature Checklist

### Dashboard Features
- [x] Total teacher count
- [x] Total course count
- [x] Total classroom count
- [x] Total timetable entries
- [x] Today's schedule display
- [x] Real-time data from MongoDB

### Teachers Module
- [x] List all teachers
- [x] Add teacher with department & specialization
- [x] Delete with confirmation
- [x] Email validation
- [x] Department badges

### Courses Module
- [x] List all courses
- [x] Add course with credits
- [x] Delete with confirmation
- [x] Credit display
- [x] Course code highlighting

### Classrooms Module
- [x] List all classrooms
- [x] Add classroom with type/capacity
- [x] Delete with confirmation
- [x] Type-based color coding
- [x] Building & floor info

### Timetable Module
- [x] Weekly view (Mon-Sun)
- [x] Add schedule entry
- [x] Dynamic dropdowns (teachers/courses/classrooms)
- [x] Teacher conflict detection
- [x] Classroom conflict detection
- [x] Time validation
- [x] Day grouping
- [x] Time sorting
- [x] Delete entries
- [x] Refresh button

---

## 🔐 Authentication Flow

1. Visit `/login` or `/signup`
2. Enter credentials
3. JWT token stored in localStorage
4. Redirects to `/dashboard`
5. All routes except login/signup protected
6. Logout clears token and redirects

---

## ⚠️ Conflict Rules

### Teacher Conflicts Prevented
- Same teacher cannot teach 2 classes at same time
- Overlapping times detected and rejected

### Classroom Conflicts Prevented  
- Same classroom cannot host 2 classes at same time
- Double-booking blocked

### Validation Messages
- "⚠️ Conflict: This teacher is already scheduled..."
- "⚠️ Conflict: This classroom is already booked..."

---

## 🎨 UI Features

### Loading States
- Spinner during data fetch
- Disabled buttons during operations
- "Adding..." / "Creating..." text

### Empty States
- Inbox icon with helpful message
- "No items found. Click 'Add' to create one."

### Error Handling
- Specific error messages
- Network error handling
- Form validation
- Time validation

### Success Feedback
- Immediate page refresh
- Updated counts displayed
- Cache synchronized

---

## 📊 Data Flow

```
User Action → Frontend API Call → Backend Route → MongoDB
     ↓                                              ↓
UI Update ← Store Cache Update ← Response ← Database
```

### Example: Add Teacher
```javascript
1. User fills form → Clicks Save
2. POST /api/teachers
3. Backend validates → Saves to MongoDB
4. Returns new teacher object
5. Frontend: store.addTeacher(teacher)
6. navigate('/teachers') → Refreshes list
7. New teacher appears in table
```

---

## 🛠️ Common Tasks

### Add a Teacher
1. Navigate to Teachers
2. Click "Add Teacher"
3. Fill form:
   - First Name, Last Name
   - Email
   - Department (dropdown)
   - Specialization
4. Click Save
5. Appears in list immediately

### Add a Course
1. Navigate to Courses
2. Click "Add Course"
3. Fill form:
   - Course Code (e.g., CS101)
   - Credits (1-6)
   - Course Name
   - Department
4. Click Save
5. Appears in list with credit badge

### Add a Classroom
1. Navigate to Classrooms
2. Click "Add Classroom"
3. Fill form:
   - Room Name (e.g., A-101)
   - Type (Lecture/Lab/Seminar)
   - Capacity
   - Building
   - Floor
4. Click Save
5. Appears with type badge

### Schedule a Class
1. Navigate to Timetable
2. Click "Add Schedule Entry"
3. Select from dropdowns:
   - Teacher
   - Course
   - Classroom
   - Day
4. Set times (Start < End)
5. Choose session type
6. Click Save
7. Conflict check happens automatically
8. Appears in weekly grid

### Delete Any Item
1. Click trash icon
2. Confirm deletion
3. Item removed immediately
4. Page refreshes

---

## 🔧 Troubleshooting

### Issue: Blank white screen
**Solution:** Check browser console for errors. All errors now have fallback UI.

### Issue: "Access denied" error
**Solution:** Token expired or missing. Login again.

### Issue: Dropdowns empty
**Solution:** Add teachers/courses/classrooms first before scheduling.

### Issue: Conflict error
**Solution:** Choose different time slot or different room/teacher.

### Issue: Port 3000 in use
**Solution:** 
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Then restart: node app.js
```

---

## 📋 API Endpoints Quick Reference

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Dashboard
- `GET /api/dashboard/stats` - Statistics
- `GET /api/dashboard/today` - Today's schedule

### CRUD Endpoints
```
Teachers:   GET/POST /api/teachers    | DELETE /api/teachers/:id
Courses:    GET/POST /api/courses     | DELETE /api/courses/:id
Classrooms: GET/POST /api/classrooms  | DELETE /api/classrooms/:id
Timetable:  GET/POST /api/timetable   | DELETE /api/timetable/:id
```

All endpoints require `Authorization: Bearer <token>` header.

---

## 💡 Pro Tips

1. **Add data in order:**
   - First: Teachers, Courses, Classrooms
   - Then: Timetable entries (needs the above)

2. **Avoid conflicts:**
   - Check existing schedule before adding
   - Use different time slots
   - Consider using different rooms

3. **Quick refresh:**
   - Click "Refresh Data" button on Timetable page
   - Or navigate away and back

4. **Bulk operations:**
   - Not yet supported (future enhancement)
   - Add items one at a time

5. **Mobile access:**
   - Responsive design works on tablets
   - Sidebar collapses on mobile

---

## 🎯 Testing Scenarios

### Scenario 1: Complete Workflow
1. Signup → Login → Dashboard
2. Add 2 teachers
3. Add 3 courses
4. Add 2 classrooms
5. Schedule 4 classes across week
6. Try scheduling conflict → Should fail
7. Delete 1 item → Confirm removal
8. Logout → Verify redirect

### Scenario 2: Conflict Detection
1. Schedule: Monday 9-10, Teacher A, Room 101
2. Try: Monday 9:30-10:30, Teacher A, Room 102
   - Expected: Teacher conflict error
3. Try: Monday 9-10, Teacher B, Room 101
   - Expected: Room conflict error
4. Try: Monday 11-12, Teacher A, Room 101
   - Expected: Success (no conflict)

### Scenario 3: Data Persistence
1. Add teacher → Note name
2. Logout
3. Login again
4. Navigate to Teachers
5. Expected: Teacher still listed

---

## 📞 Support

### Documentation Files
- `INTEGRATION_COMPLETE.md` - Detailed integration guide
- `FINAL_SUMMARY.md` - Implementation summary
- `BUG_FIXES_SUMMARY.md` - Debugging history

### Key Features Summary
✅ Full SPA navigation
✅ JWT authentication
✅ Real-time data sync
✅ Conflict prevention
✅ CRUD operations
✅ Error resilience
✅ Responsive UI

---

**Status: Production Ready 🚀**
**Version: 1.0 - Fully Integrated**
**Last Updated: March 27, 2026**
