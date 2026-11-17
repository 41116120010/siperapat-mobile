import { ASN, Meeting } from '../../domain/entities/types';

function isAdminUnitRole(user: ASN): boolean {
  const role = (user.role ?? '').toLowerCase().trim();
  return role === 'admin' || role === 'admin_unit' || role === 'admin unit';
}

function isAdministratorRole(user: ASN): boolean {
  return (user.role ?? '').toLowerCase().trim() === 'administrator';
}

function isAppointedDuringSession(user: ASN, meeting: Meeting): boolean {
  const isOngoing = meeting.rawStatus === 'ongoing' || meeting.status === 'ongoing';
  if (!isOngoing) return false;
  const userId = String(user.id);
  return (
    (meeting.leaderId != null && String(meeting.leaderId) === userId) ||
    (meeting.notulisId != null && String(meeting.notulisId) === userId)
  );
}

/**
 * Checks whether the current user is authorized to delete a meeting agenda.
 * Mirrors backend AgendaPolicy::delete.
 */
export function canDeleteMeeting(user: ASN | null, meeting: Meeting | null): boolean {
  if (!user || !meeting) return false;
  if (typeof meeting.permissions?.can_delete === 'boolean') {
    return meeting.permissions.can_delete;
  }

  if (isAdministratorRole(user)) {
    return true;
  }

  if (isAdminUnitRole(user)) {
    if (meeting.creatorId && String(meeting.creatorId) === String(user.id)) {
      return true;
    }

    if (user.unitId) {
      if (meeting.creatorUnitId && meeting.creatorUnitId === user.unitId) {
        return true;
      }

      if (!meeting.isAllUnits && meeting.unitIds && meeting.unitIds.includes(user.unitId)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Checks whether the current user is authorized to edit a meeting agenda.
 * Mirrors backend AgendaPolicy::update (prioritizes API `permissions.can_update`).
 */
export function canEditMeeting(user: ASN | null, meeting: Meeting | null): boolean {
  if (!user || !meeting) return false;
  if (typeof meeting.permissions?.can_update === 'boolean') {
    return meeting.permissions.can_update;
  }

  if (isAdministratorRole(user)) return true;

  if (isAdminUnitRole(user)) {
    if (meeting.creatorId && String(meeting.creatorId) === String(user.id)) return true;
    if (user.unitId && meeting.creatorUnitId && meeting.creatorUnitId === user.unitId) return true;
    if (isAppointedDuringSession(user, meeting)) return true;
  }

  return false;
}

/**
 * Checks whether the user can manage notulensi, kesimpulan, and documentation photos.
 * Strict parity with backend AgendaPolicy::manageMinutes.
 */
export function canManageMinutes(user: ASN | null, meeting: Meeting | null): boolean {
  if (!user || !meeting) return false;
  if (typeof meeting.permissions?.can_manage_minutes === 'boolean') {
    return meeting.permissions.can_manage_minutes;
  }
  if (meeting.rawStatus === 'cancelled' || meeting.status === 'cancelled') return false;

  if (isAdministratorRole(user)) return true;

  if (meeting.creatorId && String(meeting.creatorId) === String(user.id)) return true;

  if (isAdminUnitRole(user) && user.unitId && meeting.creatorUnitId === user.unitId) return true;

  return isAppointedDuringSession(user, meeting);
}

/**
 * Checks whether the user can upload or replace the official surat edaran.
 * Mirrors backend AgendaPolicy::manageCircular.
 */
export function canManageSuratEdaran(user: ASN | null, meeting: Meeting | null): boolean {
  if (!user || !meeting) return false;
  if (meeting.rawStatus === 'cancelled' || meeting.status === 'cancelled') return false;
  if (typeof meeting.permissions?.can_manage_circular === 'boolean') {
    return meeting.permissions.can_manage_circular;
  }

  if (isAdministratorRole(user)) return true;
  if (meeting.creatorId && String(meeting.creatorId) === String(user.id)) return true;

  return Boolean(isAdminUnitRole(user) && user.unitId && meeting.creatorUnitId === user.unitId);
}

/**
 * Checks whether the current user can add ad-hoc ASN participants during an active meeting.
 * Mirrors backend AgendaPolicy::manageParticipants (Administrator, organizing Admin Unit, or Pimpinan).
 */
export function canManageParticipants(meeting?: Meeting | null, user?: ASN | null): boolean {
  if (!meeting || !user) return false;
  if (typeof meeting.permissions?.can_manage_participants === 'boolean') {
    return meeting.permissions.can_manage_participants;
  }

  const isScheduledOrOngoing =
    meeting.rawStatus === 'scheduled' ||
    meeting.rawStatus === 'ongoing' ||
    meeting.status === 'upcoming' ||
    meeting.status === 'ongoing';
  if (!isScheduledOrOngoing) return false;

  if (isAdministratorRole(user)) return true;

  if (meeting.leaderId != null && String(meeting.leaderId) === String(user.id)) {
    return true;
  }

  if (isAdminUnitRole(user)) {
    if (meeting.creatorId != null && String(meeting.creatorId) === String(user.id)) return true;
    if (user.unitId != null && meeting.creatorUnitId === user.unitId) return true;
  }

  return false;
}
