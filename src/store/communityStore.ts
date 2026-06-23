import { create } from 'zustand';
import { api } from '@/lib/api';

export interface ZustandGroup {
  _id: string;
  name: string;
  type: string;
  description?: string;
  department?: string;
  groupIcon?: string;
  autoSyncDept?: boolean;
  createdBy?: any;
  members: { user: any; role: string; joinedAt: string }[];
  pinMessages: string[];
  updatedAt: string;
}

export interface ZustandMessage {
  _id: string;
  group: string;
  sender: {
    _id: string;
    id?: string;
    firstName: string;
    lastName: string;
    photoUrl?: string;
    role: string;
    department?: string;
  };
  content?: string;
  reactions: { user: string; emoji: string }[];
  seenBy: { user: string; seenAt: string }[];
  deliveredTo: { user: string; deliveredAt: string }[];
  attachments: { fileUrl: string; name: string; fileType: string; fileSize?: number }[];
  parentMessage?: any;
  forwardedFrom?: any;
  isPinned: boolean;
  isStarredBy: string[];
  isEdited: boolean;
  isDeleted: boolean;
  poll?: {
    question: string;
    options: { optionText: string; votes: string[] }[];
    isClosed: boolean;
  };
  event?: {
    title: string;
    type: 'Meeting' | 'Webinar' | 'Training';
    date: string;
    time: string;
    reminderMinutes: number;
    participants: string[];
  };
  voiceNote?: {
    audioUrl: string;
    duration: number;
    waveform: number[];
  };
  videoMessage?: {
    videoUrl: string;
    duration: number;
  };
  appreciation?: {
    type: string;
    recipient: any;
    badge?: string;
    details?: string;
  };
  createdAt: string;
}

export interface ZustandSocialPost {
  _id: string;
  author: any;
  content: string;
  mediaUrls: string[];
  mediaType: 'image' | 'video' | 'none';
  reactions: { user: string; type: string }[];
  comments: { _id?: string; user: any; content: string; createdAt: string }[];
  achievement?: { title: string; badgeUrl?: string };
  createdAt: string;
}

export interface ZustandKnowledgeItem {
  _id: string;
  title: string;
  content: string;
  author: any;
  department?: string;
  attachments: { name: string; fileUrl: string }[];
  category: 'SOP' | 'Training' | 'Tip' | 'Document';
  tags: string[];
  createdAt: string;
}

interface CommunityState {
  groups: ZustandGroup[];
  activeGroup: ZustandGroup | null;
  messages: ZustandMessage[];
  onlineUsers: string[]; // List of online User IDs
  typingUsers: Record<string, Record<string, string>>; // groupId -> { userId -> displayName }
  socialPosts: ZustandSocialPost[];
  knowledgeItems: ZustandKnowledgeItem[];
  activeCall: any | null;
  incomingCall: any | null;
  activeCalls: any[];
  loading: boolean;
  error: string | null;
  unreadCounts: Record<string, number>; // groupId -> unread count
  lastMessages: Record<string, ZustandMessage>; // groupId -> last message

  // Actions
  fetchGroups: () => Promise<void>;
  selectGroup: (group: ZustandGroup | null) => void;
  fetchMessages: (groupId: string) => Promise<void>;
  addMessage: (message: ZustandMessage) => void;
  updateMessage: (message: ZustandMessage) => void;
  
  // Message Actions
  sendMessage: (groupId: string, payload: any) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  reactMessage: (messageId: string, emoji: string) => Promise<void>;
  votePoll: (messageId: string, optionIndex: number) => Promise<void>;

  // Social actions
  fetchSocialPosts: () => Promise<void>;
  createSocialPost: (payload: any) => Promise<void>;
  reactSocialPost: (postId: string, type: string) => Promise<void>;
  commentSocialPost: (postId: string, content: string) => Promise<void>;

  // Knowledge actions
  fetchKnowledgeItems: (params?: Record<string, string>) => Promise<void>;
  createKnowledgeItem: (payload: any) => Promise<void>;

  // Call actions
  fetchActiveCalls: () => Promise<void>;
  startCall: (groupId: string, callType: 'voice' | 'video') => Promise<any>;
  joinCall: (callId: string) => Promise<void>;
  leaveCall: (callId: string) => Promise<void>;
  setIncomingCall: (call: any | null) => void;
  setCallUpdated: (call: any) => void;
  setCallEnded: (callId: string) => void;

  // Socket triggers
  setOnlineUsers: (userIds: string[]) => void;
  setUserOnline: (userId: string, isOnline: boolean) => void;
  setTyping: (groupId: string, userId: string, name: string, isTyping: boolean) => void;
  createGroup: (payload: any) => Promise<void>;
  markGroupRead: (groupId: string) => void;
}

export const useCommunityStore = create<CommunityState>((set, get) => ({
  groups: [],
  activeGroup: null,
  messages: [],
  onlineUsers: [],
  typingUsers: {},
  socialPosts: [],
  knowledgeItems: [],
  activeCall: null,
  incomingCall: null,
  activeCalls: [],
  loading: false,
  error: null,
  unreadCounts: {},
  lastMessages: {},

  fetchGroups: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.get('/community/groups');
      set({ groups: res.data.groups, loading: false });
      
      // Auto select first group if none active
      const currentActive = get().activeGroup;
      if (!currentActive && res.data.groups.length > 0) {
        get().selectGroup(res.data.groups[0]);
      }
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  selectGroup: (group) => {
    set({ activeGroup: group, messages: [] });
    if (group) {
      get().fetchMessages(group._id);
    }
  },

  fetchMessages: async (groupId) => {
    try {
      const res = await api.get(`/community/groups/${groupId}/messages`);
      set({ messages: res.data.messages });
    } catch (err: any) {
      console.error('Failed to fetch messages:', err);
    }
  },

  addMessage: (message) => {
    const active = get().activeGroup;
    if (active && message.group === active._id) {
      set((state) => {
        // Prevent duplicate append
        if (state.messages.some((m) => m._id === message._id)) return state;
        return { messages: [...state.messages, message] };
      });
    } else {
      // Increment unread count for non-active groups
      set((state) => ({
        unreadCounts: {
          ...state.unreadCounts,
          [message.group]: (state.unreadCounts[message.group] || 0) + 1
        }
      }));
    }

    // Track last message per group
    set((state) => ({
      lastMessages: {
        ...state.lastMessages,
        [message.group]: message
      }
    }));

    // Refresh groups list ordering to show latest updated message time
    set((state) => ({
      groups: state.groups.map((g) => 
        g._id === message.group ? { ...g, updatedAt: message.createdAt } : g
      ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    }));
  },

  updateMessage: (message) => {
    set((state) => ({
      messages: state.messages.map((m) => (m._id === message._id ? message : m))
    }));
  },

  sendMessage: async (groupId, payload) => {
    try {
      const res = await api.post(`/community/groups/${groupId}/messages`, payload);
      // We append immediately on API return (or wait for socket broadcast)
      get().addMessage(res.data.message);
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
    }
  },

  editMessage: async (messageId, content) => {
    try {
      const res = await api.put(`/community/messages/${messageId}`, { content });
      get().updateMessage(res.data.message);
    } catch (err: any) {
      alert(err.message || 'Failed to edit message');
    }
  },

  deleteMessage: async (messageId) => {
    try {
      const res = await api.delete(`/community/messages/${messageId}`);
      get().updateMessage(res.data.message);
    } catch (err: any) {
      alert(err.message || 'Failed to delete message');
    }
  },

  reactMessage: async (messageId, emoji) => {
    try {
      const res = await api.post(`/community/messages/${messageId}/react`, { emoji });
      get().updateMessage(res.data.message);
    } catch (err: any) {
      console.error(err);
    }
  },

  votePoll: async (messageId, optionIndex) => {
    try {
      const res = await api.post(`/community/messages/${messageId}/vote`, { optionIndex });
      get().updateMessage(res.data.message);
    } catch (err: any) {
      console.error(err);
    }
  },

  fetchSocialPosts: async () => {
    try {
      const res = await api.get('/community/social');
      set({ socialPosts: res.data.posts });
    } catch (err: any) {
      console.error(err);
    }
  },

  createSocialPost: async (payload) => {
    try {
      const res = await api.post('/community/social', payload);
      set((state) => ({ socialPosts: [res.data.post, ...state.socialPosts] }));
    } catch (err: any) {
      alert(err.message || 'Failed to create social post');
    }
  },

  reactSocialPost: async (postId, type) => {
    try {
      const res = await api.post(`/community/social/${postId}/react`, { type });
      set((state) => ({
        socialPosts: state.socialPosts.map((p) => (p._id === postId ? res.data.post : p))
      }));
    } catch (err: any) {
      console.error(err);
    }
  },

  commentSocialPost: async (postId, content) => {
    try {
      const res = await api.post(`/community/social/${postId}/comment`, { content });
      set((state) => ({
        socialPosts: state.socialPosts.map((p) => (p._id === postId ? res.data.post : p))
      }));
    } catch (err: any) {
      alert(err.message || 'Failed to leave comment');
    }
  },

  fetchKnowledgeItems: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const res = await api.get(`/community/knowledge?${queryString}`);
      set({ knowledgeItems: res.data.items });
    } catch (err: any) {
      console.error(err);
    }
  },

  createKnowledgeItem: async (payload) => {
    try {
      const res = await api.post('/community/knowledge', payload);
      set((state) => ({ knowledgeItems: [res.data.item, ...state.knowledgeItems] }));
    } catch (err: any) {
      alert(err.message || 'Failed to publish knowledge item');
    }
  },

  createGroup: async (payload) => {
    try {
      const res = await api.post('/community/groups', payload);
      set((state) => ({
        groups: [res.data.group, ...state.groups]
      }));
      get().selectGroup(res.data.group);
    } catch (err: any) {
      alert(err.message || 'Failed to create group');
    }
  },

  fetchActiveCalls: async () => {
    try {
      const res = await api.get('/community/calls/active');
      set({ activeCalls: res.data.activeCalls });
    } catch (err: any) {
      console.error('Failed to fetch active calls:', err);
    }
  },

  startCall: async (groupId, callType) => {
    try {
      const res = await api.post('/community/calls', { groupId, callType });
      set({ activeCall: res.data.data.callSession });
      return res.data.data;
    } catch (err: any) {
      alert(err.message || 'Failed to start call');
      throw err;
    }
  },

  joinCall: async (callId) => {
    try {
      const res = await api.post(`/community/calls/${callId}/join`, {});
      set({ activeCall: res.data.data.callSession });
    } catch (err: any) {
      alert(err.message || 'Failed to join call');
    }
  },

  leaveCall: async (callId) => {
    try {
      await api.post(`/community/calls/${callId}/leave`, {});
      set({ activeCall: null });
    } catch (err: any) {
      console.error('Failed to leave call:', err);
      set({ activeCall: null });
    }
  },

  setIncomingCall: (call) => set({ incomingCall: call }),

  setCallUpdated: (call) => {
    set((state) => {
      const isMyCall = state.activeCall?._id === call._id;
      let updatedActiveCalls = state.activeCalls.map((c) =>
        c._id === call._id ? call : c
      );
      if (!state.activeCalls.some((c) => c._id === call._id) && call.status === 'ongoing') {
        updatedActiveCalls.push(call);
      }
      return {
        activeCall: isMyCall ? call : state.activeCall,
        activeCalls: updatedActiveCalls.filter((c) => c.status === 'ongoing')
      };
    });
  },

  setCallEnded: (callId) => {
    set((state) => {
      const isMyCall = state.activeCall?._id === callId;
      return {
        activeCall: isMyCall ? null : state.activeCall,
        activeCalls: state.activeCalls.filter((c) => c._id !== callId)
      };
    });
  },

  setOnlineUsers: (userIds) => set({ onlineUsers: userIds }),

  setUserOnline: (userId, isOnline) => {
    set((state) => {
      const currentOnline = new Set(state.onlineUsers);
      if (isOnline) {
        currentOnline.add(userId);
      } else {
        currentOnline.delete(userId);
      }
      return { onlineUsers: Array.from(currentOnline) };
    });
  },

  setTyping: (groupId, userId, name, isTyping) => {
    set((state) => {
      const groupTyping = state.typingUsers[groupId] || {};
      if (isTyping) {
        groupTyping[userId] = name;
      } else {
        delete groupTyping[userId];
      }
      return {
        typingUsers: {
          ...state.typingUsers,
          [groupId]: { ...groupTyping }
        }
      };
    });
  },

  markGroupRead: (groupId) => {
    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [groupId]: 0 }
    }));
  }
}));
