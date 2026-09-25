package com.ku.services;

import com.ku.dao.CourseDAO;
import com.ku.dao.LecturerDAO;
import com.ku.dao.StudentDAO;
import com.ku.dao.UserDAO;
import com.ku.models.Course;
import com.ku.models.Lecturer;
import com.ku.models.Student;

import java.util.List;

/**
 * AdminService.java
 * High-privilege management service for the Administrator at Kingstone University.
 * Allows adding new student and lecturer accounts, configuring departments, and system audits.
 */
public class AdminService {

    private final StudentDAO studentDAO;
    private final LecturerDAO lecturerDAO;
    private final CourseDAO courseDAO;
    private final UserDAO userDAO;

    public AdminService() {
        this.studentDAO = new StudentDAO();
        this.lecturerDAO = new LecturerDAO();
        this.courseDAO = new CourseDAO();
        this.userDAO = new UserDAO();
    }

    public List<Student> getAllStudents() {
        return studentDAO.findAll();
    }

    public boolean registerNewStudent(Student student) {
        if (student.getRegNumber() == null || student.getRegNumber().trim().isEmpty()) {
            throw new IllegalArgumentException("Registration Number is mandatory.");
        }
        return studentDAO.save(student);
    }

    public List<Lecturer> getAllLecturers() {
        return lecturerDAO.findAll();
    }

    public boolean registerNewLecturer(Lecturer lecturer) {
        if (lecturer.getStaffId() == null || lecturer.getStaffId().trim().isEmpty()) {
            throw new IllegalArgumentException("Staff ID is mandatory.");
        }
        return lecturerDAO.save(lecturer);
    }

    public List<Course> getAllCourses() {
        return courseDAO.findAll();
    }
}
