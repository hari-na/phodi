import type { Course, Lesson, LanguageCode } from "./types";
import knCourse from "@content/kn/course.json";

const courses: Record<string, Course> = {
  kn: knCourse as unknown as Course,
};

export function getCourse(lang: LanguageCode): Course | null {
  return courses[lang] ?? null;
}

export function getAllCourses(): Course[] {
  return Object.values(courses);
}

export function getLesson(lang: LanguageCode, lessonId: string): Lesson | null {
  const course = getCourse(lang);
  if (!course) return null;
  for (const unit of course.units) {
    for (const lesson of unit.lessons) {
      if (lesson.id === lessonId) return lesson;
    }
  }
  return null;
}

export function getAllLessonIds(lang: LanguageCode): string[] {
  const course = getCourse(lang);
  if (!course) return [];
  return course.units.flatMap((u) => u.lessons.map((l) => l.id));
}
