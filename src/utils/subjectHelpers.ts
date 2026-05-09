import { TYT_SUBJECTS, AYT_SUBJECTS } from '../constants';
import { SubjectStatus } from '../types';

export function getInitialTytSubjects(): SubjectStatus[] {
  const subjects: SubjectStatus[] = [];
  Object.entries(TYT_SUBJECTS).forEach(([category, list]) => {
    list.forEach(name => {
      subjects.push({
        subject: name,
        category,
        status: 'not-started',
        mastery: 0,
      });
    });
  });
  return subjects;
}

export function getInitialAytSubjects(): SubjectStatus[] {
  const subjects: SubjectStatus[] = [];
  Object.entries(AYT_SUBJECTS).forEach(([category, list]) => {
    list.forEach(name => {
      subjects.push({
        subject: name,
        category,
        status: 'not-started',
        mastery: 0,
      });
    });
  });
  return subjects;
}
