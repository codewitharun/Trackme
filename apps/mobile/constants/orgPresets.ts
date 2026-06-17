export interface OrgPreset {
  key: string;
  label: string;
  icon: string;
  purpose: string;
  adminRole: string;
  supervisorRole: string;
  participantRole: string;
  activityLabel: string;
  reportLabel: string;
}

export const ORG_PRESETS: OrgPreset[] = [
  {
    key: 'school',
    label: 'School / Academy',
    icon: '🏫',
    purpose: 'Track daily study habits and student accountability',
    adminRole: 'Principal',
    supervisorRole: 'Teacher',
    participantRole: 'Student',
    activityLabel: 'Study Check-in',
    reportLabel: 'Daily Summary',
  },
  {
    key: 'corporate',
    label: 'Company / Corporate',
    icon: '🏢',
    purpose: 'Monitor employee productivity and daily work progress',
    adminRole: 'Director',
    supervisorRole: 'Manager',
    participantRole: 'Employee',
    activityLabel: 'Work Check-in',
    reportLabel: 'Daily Standup',
  },
  {
    key: 'library',
    label: 'Library',
    icon: '📚',
    purpose: 'Track member reading sessions and library visits',
    adminRole: 'Chief Librarian',
    supervisorRole: 'Librarian',
    participantRole: 'Member',
    activityLabel: 'Visit Check-in',
    reportLabel: 'Session Report',
  },
  {
    key: 'coaching',
    label: 'Coaching Center',
    icon: '🎓',
    purpose: 'Track trainee progress and coaching session attendance',
    adminRole: 'Head Coach',
    supervisorRole: 'Coach',
    participantRole: 'Trainee',
    activityLabel: 'Training Check-in',
    reportLabel: 'Progress Report',
  },
  {
    key: 'fitness',
    label: 'Gym / Fitness',
    icon: '🏋️',
    purpose: 'Monitor workout sessions and fitness progress',
    adminRole: 'Gym Owner',
    supervisorRole: 'Trainer',
    participantRole: 'Member',
    activityLabel: 'Workout Check-in',
    reportLabel: 'Fitness Log',
  },
  {
    key: 'healthcare',
    label: 'Healthcare / Clinic',
    icon: '🏥',
    purpose: 'Track intern and staff attendance and daily activities',
    adminRole: 'Chief',
    supervisorRole: 'Supervisor',
    participantRole: 'Intern',
    activityLabel: 'Shift Check-in',
    reportLabel: 'Daily Log',
  },
  {
    key: 'custom',
    label: 'Other / Custom',
    icon: '✨',
    purpose: '',
    adminRole: 'Admin',
    supervisorRole: 'Supervisor',
    participantRole: 'Member',
    activityLabel: 'Check-in',
    reportLabel: 'Daily Report',
  },
];
