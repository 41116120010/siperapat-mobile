import AsyncStorage from '@react-native-async-storage/async-storage';
import { IMeetingRepository } from '../../domain/repositories/interfaces';
import { Meeting } from '../../domain/entities/types';
import { MOCK_MEETINGS } from '../datasources/mockData';

const MEETINGS_STORAGE_KEY = '@siperapat_meetings_data';

export class MeetingRepositoryImpl implements IMeetingRepository {
  private async loadOrSeedMeetings(): Promise<Meeting[]> {
    try {
      const stored = await AsyncStorage.getItem(MEETINGS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as Meeting[];
      }
    } catch {
      // Ignore and fallback
    }
    // Seed default
    await AsyncStorage.setItem(MEETINGS_STORAGE_KEY, JSON.stringify(MOCK_MEETINGS));
    return MOCK_MEETINGS;
  }

  async getMeetings(): Promise<Meeting[]> {
    return this.loadOrSeedMeetings();
  }

  async getMeetingById(id: string): Promise<Meeting | null> {
    const list = await this.loadOrSeedMeetings();
    return list.find((m) => m.id === id) ?? null;
  }

  async createMeeting(meetingData: Omit<Meeting, 'id' | 'totalAttended'>): Promise<Meeting> {
    const list = await this.loadOrSeedMeetings();
    const newMeeting: Meeting = {
      ...meetingData,
      id: `meet-${Date.now()}`,
      totalAttended: 0,
    };
    const updated = [newMeeting, ...list];
    await AsyncStorage.setItem(MEETINGS_STORAGE_KEY, JSON.stringify(updated));
    return newMeeting;
  }

  async getUpcomingMeetings(): Promise<Meeting[]> {
    const list = await this.loadOrSeedMeetings();
    return list.filter((m) => m.status === 'upcoming');
  }

  async getActiveMeeting(): Promise<Meeting | null> {
    const list = await this.loadOrSeedMeetings();
    return list.find((m) => m.status === 'ongoing') ?? list[0] ?? null;
  }
}
