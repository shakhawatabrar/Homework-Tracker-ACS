export interface Student {
  id: string;
  name: string;
  roll: string;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  date: string;
  timestamp: number;
}

export interface ClassModule {
  id: string;
  title: string;
  description: string;
  link: string;
  date: string;
  timestamp: number;
}

export interface TeamRule {
  id: string;
  title: string;
  content: string;
  timestamp: number;
}

export interface Exam {
  id: string;
  title: string;
  date: string;
  totalMarks: number;
  isPublished: boolean;
  marks: Record<string, number | null>; // studentId -> marks (null means absent)
  timestamp: number;
}

export interface Complaint {
  id: string;
  studentName: string;
  studentRoll: string;
  text: string;
  timestamp: number;
  isRead: boolean;
}

export interface HomeworkRecord {
  date: string; // YYYY-MM-DD
  submissions: Record<string, boolean>; // studentId -> isSubmitted
}
