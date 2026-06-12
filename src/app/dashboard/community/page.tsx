'use client';

import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';
import { useCommunityStore, ZustandGroup, ZustandMessage, ZustandSocialPost, ZustandKnowledgeItem } from '@/store/communityStore';
import { api } from '@/lib/api';
import {
  MessageSquare,
  Send,
  Plus,
  Pin,
  Star,
  Trash,
  Edit,
  CheckCheck,
  FileText,
  Image as ImageIcon,
  Video,
  Mic,
  Calendar,
  Trophy,
  Search,
  Award,
  Sparkles,
  Play,
  Pause,
  Clock,
  Lock,
  Megaphone,
  ThumbsUp,
  Heart,
  Smile,
  Lightbulb,
  BookOpen,
  Download,
  BarChart2,
  Paperclip,
  Check,
  CheckSquare,
  Users,
  VideoOff,
  PhoneCall
} from 'lucide-react';

export default function CommunityHubPage() {
  const { user } = useAuthStore();
  const store = useCommunityStore();
  
  // Active Section Tab: 'chat' | 'social' | 'knowledge' | 'analytics'
  const [activeTab, setActiveTab] = useState<'chat' | 'social' | 'knowledge' | 'analytics'>('chat');
  const [mobileShowSidebar, setMobileShowSidebar] = useState(true);
  
  // Real-time Chat States
  const [socket, setSocket] = useState<Socket | null>(null);
  const [typedMessage, setTypedMessage] = useState('');
  const [replyMessage, setReplyMessage] = useState<ZustandMessage | null>(null);
  const [isTypingState, setIsTypingState] = useState(false);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearchPanel, setActiveSearchPanel] = useState(false);

  // Group Create Dialog
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupType, setNewGroupType] = useState<string>('PublicGroup');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupDept, setNewGroupDept] = useState('');
  
  // Call Dialog Stub
  const [activeCall, setActiveCall] = useState<{ type: 'audio' | 'video'; channel: string } | null>(null);

  // Record Modals
  const [audioRecording, setAudioRecording] = useState(false);
  const [audioTimer, setAudioTimer] = useState(0);
  const [videoRecording, setVideoRecording] = useState(false);
  const [videoTimer, setVideoTimer] = useState(0);

  // Appreciation Modal State
  const [showAppreciationModal, setShowAppreciationModal] = useState(false);
  const [awardRecipient, setAwardRecipient] = useState('');
  const [awardType, setAwardType] = useState('EmployeeOfMonth');
  const [awardDetails, setAwardDetails] = useState('');
  const [recipientList, setRecipientList] = useState<any[]>([]);

  // Poll Modal State
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  // Event Modal State
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventType, setEventType] = useState<'Meeting' | 'Webinar' | 'Training'>('Meeting');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');

  // Social feed inputs
  const [socialContent, setSocialContent] = useState('');
  const [socialMediaUrl, setSocialMediaUrl] = useState('');
  const [socialMediaType, setSocialMediaType] = useState<'image' | 'video' | 'none'>('none');
  const [socialAchievementTitle, setSocialAchievementTitle] = useState('');
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});

  // Knowledge base inputs
  const [showSopModal, setShowSopModal] = useState(false);
  const [sopTitle, setSopTitle] = useState('');
  const [sopContent, setSopContent] = useState('');
  const [sopCategory, setSopCategory] = useState<'SOP' | 'Training' | 'Tip' | 'Document'>('SOP');
  const [sopDept, setSopDept] = useState('');
  const [sopTags, setSopTags] = useState('');
  const [sopAttachmentUrl, setSopAttachmentUrl] = useState('');
  const [sopAttachmentName, setSopAttachmentName] = useState('');
  const [sopSearch, setSopSearch] = useState('');
  const [selectedSopItem, setSelectedSopItem] = useState<ZustandKnowledgeItem | null>(null);

  // Audio playing helper states
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Establish Socket.IO Client Link
  useEffect(() => {
    // Empty arguments automatically matches origin port of Next.js/Express
    const newSocket = io({
      auth: {
        token: useAuthStore.getState().accessToken
      }
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('[Socket connected successfully]');
    });

    // Real-time Event Subscriptions
    newSocket.on('new_message', (message: ZustandMessage) => {
      store.addMessage(message);
    });

    newSocket.on('message_updated', (message: ZustandMessage) => {
      store.updateMessage(message);
    });

    newSocket.on('message_deleted', (messageId: string) => {
      // Fetch fresh active messages
      if (store.activeGroup) {
        store.fetchMessages(store.activeGroup._id);
      }
    });

    newSocket.on('user_typing_start', ({ groupId, userId, name }: any) => {
      store.setTyping(groupId, userId, name, true);
    });

    newSocket.on('user_typing_stop', ({ groupId, userId }: any) => {
      store.setTyping(groupId, userId, '', false);
    });

    newSocket.on('user_status_change', ({ userId, status }: any) => {
      store.setUserOnline(userId, status === 'online');
    });

    // Load active users list
    api.get('/community/realtime/online').then((res) => {
      store.setOnlineUsers(res.data.onlineUsers || []);
    }).catch(console.error);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Fetch initial group layout
  useEffect(() => {
    store.fetchGroups();
    
    // Load members for appreciation recipient picker
    api.get('/employees').then((res) => {
      setRecipientList(res.data.employees || []);
    }).catch(console.error);
  }, []);

  // Fetch tab data lazily on tab change
  useEffect(() => {
    if (activeTab === 'social') {
      store.fetchSocialPosts();
    } else if (activeTab === 'knowledge') {
      store.fetchKnowledgeItems();
    }
  }, [activeTab]);

  // Sync group rooms on navigation selection
  useEffect(() => {
    if (!socket || !store.activeGroup) return;

    socket.emit('join_group', store.activeGroup._id);
    
    // Clear typing indicators
    store.setTyping(store.activeGroup._id, '', '', false);

    return () => {
      if (store.activeGroup) {
        socket.emit('leave_group', store.activeGroup._id);
      }
    };
  }, [store.activeGroup, socket]);

  // Handle typing triggers
  useEffect(() => {
    if (!socket || !store.activeGroup) return;
    
    if (typedMessage.length > 0) {
      if (!isTypingState) {
        setIsTypingState(true);
        socket.emit('typing_start', store.activeGroup._id);
      }
    } else {
      if (isTypingState) {
        setIsTypingState(false);
        socket.emit('typing_stop', store.activeGroup._id);
      }
    }
  }, [typedMessage]);

  // Scroll to bottom on messages load
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [store.messages]);

  // Handlers
  const handleSendTextMessage = () => {
    if (!store.activeGroup || (!typedMessage.trim() && !replyMessage)) return;

    const payload: any = {
      content: typedMessage
    };

    if (replyMessage) {
      payload.parentMessage = replyMessage._id;
    }

    store.sendMessage(store.activeGroup._id, payload);
    setTypedMessage('');
    setReplyMessage(null);
  };

  const handleGroupCreateSubmit = async () => {
    if (!newGroupName.trim()) return;
    
    await store.createGroup({
      name: newGroupName,
      type: newGroupType,
      description: newGroupDesc,
      department: newGroupType === 'DepartmentGroup' ? newGroupDept : undefined
    });

    setNewGroupName('');
    setNewGroupDesc('');
    setNewGroupDept('');
    setShowCreateGroup(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !store.activeGroup) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/community/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${useAuthStore.getState().accessToken}`
        },
        body: formData
      });
      const data = await res.json();
      
      if (data.status === 'success') {
        // Submit upload message payload
        await store.sendMessage(store.activeGroup._id, {
          attachments: [data.data]
        });
      } else {
        alert(data.message || 'File upload failed');
      }
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    }
  };

  // Mock Voice Recording submit handler
  const triggerAudioRecord = () => {
    if (!audioRecording) {
      setAudioRecording(true);
      setAudioTimer(0);
      const interval = setInterval(() => {
        setAudioTimer((prev) => prev + 1);
      }, 1000);
      (window as any).audioRecordInterval = interval;
    } else {
      clearInterval((window as any).audioRecordInterval);
      setAudioRecording(false);
      
      // Submit voice note message
      if (store.activeGroup) {
        store.sendMessage(store.activeGroup._id, {
          voiceNote: {
            audioUrl: '/uploads/mock-audio.mp3', // Mock audio static asset
            duration: audioTimer || 8,
            waveform: Array.from({ length: 24 }, () => Math.floor(Math.random() * 80) + 20)
          }
        });
      }
    }
  };

  // Mock Video Message submit handler
  const triggerVideoRecord = () => {
    if (!videoRecording) {
      setVideoRecording(true);
      setVideoTimer(0);
      const interval = setInterval(() => {
        setVideoTimer((prev) => prev + 1);
      }, 1000);
      (window as any).videoRecordInterval = interval;
    } else {
      clearInterval((window as any).videoRecordInterval);
      setVideoRecording(false);
      
      // Submit video note message
      if (store.activeGroup) {
        store.sendMessage(store.activeGroup._id, {
          videoMessage: {
            videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-hand-holding-smartphone-recording-video-in-nature-41582-large.mp4', // Mock circular video message
            duration: videoTimer || 6
          }
        });
      }
    }
  };

  // Poll Submit
  const handlePollSubmit = () => {
    if (!pollQuestion.trim() || !store.activeGroup) return;
    
    const validOptions = pollOptions.filter((opt) => opt.trim() !== '').map((o) => ({
      optionText: o,
      votes: []
    }));

    if (validOptions.length < 2) {
      alert('Please add at least 2 valid options');
      return;
    }

    store.sendMessage(store.activeGroup._id, {
      poll: {
        question: pollQuestion,
        options: validOptions,
        isClosed: false
      }
    });

    setPollQuestion('');
    setPollOptions(['', '']);
    setShowPollModal(false);
  };

  // Event Submit
  const handleEventSubmit = () => {
    if (!eventTitle.trim() || !eventDate || !eventTime || !store.activeGroup) return;

    store.sendMessage(store.activeGroup._id, {
      event: {
        title: eventTitle,
        type: eventType,
        date: new Date(eventDate),
        time: eventTime,
        reminderMinutes: 15,
        participants: []
      }
    });

    setEventTitle('');
    setEventDate('');
    setEventTime('');
    setShowEventModal(false);
  };

  // Appreciation Submit
  const handleAppreciationSubmit = () => {
    if (!awardRecipient || !store.activeGroup) return;

    store.sendMessage(store.activeGroup._id, {
      appreciation: {
        type: awardType,
        recipient: awardRecipient,
        details: awardDetails || 'Outstanding operations capability in hotel standards.'
      }
    });

    setAwardRecipient('');
    setAwardDetails('');
    setShowAppreciationModal(false);
  };

  // Social Wall Submit
  const handleSocialSubmit = () => {
    if (!socialContent.trim()) return;

    const payload: any = {
      content: socialContent,
      mediaUrls: socialMediaUrl ? [socialMediaUrl] : [],
      mediaType: socialMediaType
    };

    if (socialAchievementTitle) {
      payload.achievement = {
        title: socialAchievementTitle
      };
    }

    store.createSocialPost(payload);
    setSocialContent('');
    setSocialMediaUrl('');
    setSocialMediaType('none');
    setSocialAchievementTitle('');
  };

  const handleSocialCommentSubmit = (postId: string) => {
    const content = commentInput[postId];
    if (!content?.trim()) return;

    store.commentSocialPost(postId, content);
    setCommentInput({
      ...commentInput,
      [postId]: ''
    });
  };

  // SOP publication submit
  const handleSopSubmit = () => {
    if (!sopTitle.trim() || !sopContent.trim()) return;

    const payload: any = {
      title: sopTitle,
      content: sopContent,
      category: sopCategory,
      department: sopDept || undefined,
      tags: sopTags.split(',').map((t) => t.trim()).filter((t) => t !== ''),
      attachments: sopAttachmentUrl ? [{ name: sopAttachmentName || 'SOP PDF Guide', fileUrl: sopAttachmentUrl }] : []
    };

    store.createKnowledgeItem(payload);
    setSopTitle('');
    setSopContent('');
    setSopDept('');
    setSopTags('');
    setSopAttachmentUrl('');
    setSopAttachmentName('');
    setShowSopModal(false);
  };

  // Live query search filters
  const filteredMessages = store.messages.filter((msg) => {
    if (!searchTerm) return true;
    return msg.content?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const activeGroupTypingStr = () => {
    if (!store.activeGroup) return '';
    const typingList = store.typingUsers[store.activeGroup._id] || {};
    const names = Object.values(typingList);
    if (names.length === 0) return '';
    if (names.length === 1) return `${names[0]} is typing...`;
    return `${names.slice(0, 2).join(', ')} and others are typing...`;
  };

  const calculatePollTotalVotes = (poll: any) => {
    return poll.options.reduce((sum: number, opt: any) => sum + (opt.votes?.length || 0), 0);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-14rem)] md:h-[calc(100vh-8rem)] text-slate-100 relative">
      
      {/* Top Header Modules / Tabs Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800/80 pb-4 mb-4 gap-3 w-full overflow-hidden">
        <div className="flex bg-slate-900/60 p-1.5 rounded-xl border border-slate-800/50 overflow-x-auto whitespace-nowrap max-w-full scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
          <button
            onClick={() => { setActiveTab('chat'); setMobileShowSidebar(true); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all flex-shrink-0 ${
              activeTab === 'chat'
                ? 'bg-gold text-slate-dark gold-glow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare size={14} />
            Chat Workspace
          </button>
          <button
            onClick={() => setActiveTab('social')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all flex-shrink-0 ${
              activeTab === 'social'
                ? 'bg-gold text-slate-dark gold-glow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Trophy size={14} />
            Employee Social Wall
          </button>
          <button
            onClick={() => setActiveTab('knowledge')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all flex-shrink-0 ${
              activeTab === 'knowledge'
                ? 'bg-gold text-slate-dark gold-glow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen size={14} />
            Knowledge SOP Base
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all flex-shrink-0 ${
              activeTab === 'analytics'
                ? 'bg-gold text-slate-dark gold-glow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart2 size={14} />
            Engagement Analytics
          </button>
        </div>

        {/* Global Hub Search Bar */}
        <div className="flex items-center gap-2 relative w-full md:w-auto">
          <Search size={16} className="absolute left-3 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search channels, post achievements, SOPs..."
            className="bg-card-dark text-xs pl-9 pr-4 py-2 w-full md:w-72 rounded-lg border border-slate-800 focus:border-gold outline-none text-slate-300"
          />
        </div>
      </div>

      {/* Main Content Workspace mapping Active Tabs */}
      <div className="flex-1 flex overflow-hidden gap-4 min-h-0">

        {/* =================================== TAB 1: REALTIME CHAT =================================== */}
        {activeTab === 'chat' && (
          <>
            {/* Sidebar Pane (Groups / Channels list) */}
            <div className={`w-full md:w-80 flex-col bg-card-dark border border-slate-800/80 rounded-xl overflow-hidden flex-shrink-0 ${
              mobileShowSidebar ? 'flex' : 'hidden md:flex'
            }`}>
              <div className="p-4 border-b border-slate-800/60 flex items-center justify-between">
                <span className="text-xs font-bold text-gold uppercase tracking-wider">OXY Channels</span>
                {['ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER'].includes(user?.role || '') && (
                  <button
                    onClick={() => setShowCreateGroup(true)}
                    className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-gold transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                )}
              </div>

              {/* Group List Scroll area */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {store.groups.map((g) => {
                  const isActive = store.activeGroup?._id === g._id;
                  const isGlobal = g.type === 'GlobalGroup';
                  const isAnnouncement = g.type === 'AnnouncementChannel';
                  
                  return (
                    <button
                      key={g._id}
                      onClick={() => {
                        store.selectGroup(g);
                        setMobileShowSidebar(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                        isActive
                          ? 'bg-slate-800/80 border-l-2 border-gold text-white'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center border font-bold text-xs ${
                        isGlobal ? 'bg-gold/10 border-gold/30 text-gold' : 
                        isAnnouncement ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-slate-800 border-slate-700 text-slate-300'
                      }`}>
                        {isGlobal ? '#' : isAnnouncement ? '📢' : g.name.charAt(0).toUpperCase()}
                      </div>
                      
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold truncate">{g.name}</p>
                          <span className="text-[9px] text-slate-500 font-mono">
                            {new Date(g.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">
                          {g.description || `${g.type}`}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Chat Workspace Center Pane */}
            <div className={`flex-1 flex-col bg-card-dark border border-slate-800/80 rounded-xl overflow-hidden min-w-0 ${
              !mobileShowSidebar ? 'flex' : 'hidden md:flex'
            }`}>
              
              {store.activeGroup ? (
                <>
                  {/* Active Header */}
                  <div className="h-16 bg-slate-900/60 border-b border-slate-800/60 px-4 md:px-6 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <button
                        onClick={() => setMobileShowSidebar(true)}
                        className="md:hidden p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-gold transition-colors mr-1 flex-shrink-0 font-bold"
                        title="Back to Channels"
                      >
                        &larr;
                      </button>
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-bold text-white uppercase tracking-wider truncate">{store.activeGroup.name}</h3>
                          <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-gold font-semibold uppercase font-mono flex-shrink-0">
                            {store.activeGroup.type}
                          </span>
                        </div>
                        <p className="text-[9px] text-slate-400 truncate mt-0.5 max-w-[200px] sm:max-w-[400px]">
                          {activeGroupTypingStr() || store.activeGroup.description || 'Corporate operations hub'}
                        </p>
                      </div>
                    </div>

                    {/* Stubs: Calls Buttons */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setActiveCall({ type: 'audio', channel: store.activeGroup!.name })}
                        className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-gold transition-colors"
                        title="Voice Call"
                      >
                        <PhoneCall size={15} />
                      </button>
                      <button
                        onClick={() => setActiveCall({ type: 'video', channel: store.activeGroup!.name })}
                        className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-gold transition-colors"
                        title="Circular Video Stream"
                      >
                        <Video size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Message scroll board */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {filteredMessages.map((msg) => {
                      const isMe = msg.sender?._id === user?.id;
                      const isDeleted = msg.isDeleted;
                      const containsPoll = !!msg.poll;
                      const containsEvent = !!msg.event;
                      const containsVoice = !!msg.voiceNote;
                      const containsVideo = !!msg.videoMessage;
                      const containsAppreciation = !!msg.appreciation;

                      return (
                        <div
                          key={msg._id}
                          className={`flex items-start gap-3 ${isMe ? 'flex-row-reverse' : ''}`}
                        >
                          {/* User Avatar */}
                          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-gold flex-shrink-0">
                            {msg.sender?.photoUrl ? (
                              <img src={msg.sender.photoUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                            ) : (
                              msg.sender?.firstName?.charAt(0) || 'U'
                            )}
                          </div>

                          {/* Message Bubble Container */}
                          <div className={`flex flex-col max-w-[70%] ${isMe ? 'items-end' : ''}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-bold text-slate-400">
                                {msg.sender?.firstName} {msg.sender?.lastName}
                              </span>
                              <span className="text-[8px] text-slate-500 font-mono">
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            {/* Pinned visual wrappers if it is appreciation */}
                            {containsAppreciation ? (
                              <div className="p-4 bg-gradient-to-r from-gold/20 via-gold/10 to-transparent border border-gold/40 rounded-xl relative overflow-hidden shadow-lg gold-glow text-left min-w-[280px]">
                                <div className="absolute right-2 top-2 text-gold animate-pulse">
                                  <Trophy size={28} />
                                </div>
                                <div className="flex items-center gap-2">
                                  <Award className="text-gold" size={16} />
                                  <span className="text-[10px] uppercase font-bold text-gold tracking-widest">Appreciation Award</span>
                                </div>
                                <h4 className="text-xs font-extrabold text-white mt-1 uppercase">
                                  {msg.appreciation?.type.replace(/([A-Z])/g, ' $1').trim()}
                                </h4>
                                <p className="text-[11px] text-slate-300 font-bold mt-2">
                                  Recipient: {msg.appreciation?.recipient ? `${msg.appreciation.recipient.firstName} ${msg.appreciation.recipient.lastName}` : 'Employee'}
                                </p>
                                <p className="text-[10px] text-slate-400 mt-1 italic">
                                  "{msg.appreciation?.details}"
                                </p>
                              </div>
                            ) : containsPoll ? (
                              <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-xl text-left min-w-[260px]">
                                <div className="flex items-center gap-2 mb-2">
                                  <BarChart2 size={14} className="text-gold" />
                                  <span className="text-[10px] text-gold uppercase tracking-wider font-extrabold">Active Poll</span>
                                </div>
                                <h4 className="text-xs font-bold text-white mb-3">{msg.poll?.question}</h4>
                                <div className="space-y-2">
                                  {msg.poll?.options.map((opt: any, optIdx: number) => {
                                    const totalVotes = calculatePollTotalVotes(msg.poll);
                                    const voteCount = opt.votes?.length || 0;
                                    const percent = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                                    const hasVoted = opt.votes?.some((vId: string) => vId.toString() === user?.id);

                                    return (
                                      <button
                                        key={optIdx}
                                        onClick={() => store.votePoll(msg._id, optIdx)}
                                        className={`w-full text-left p-2.5 rounded-lg border text-xs relative overflow-hidden transition-all ${
                                          hasVoted
                                            ? 'bg-gold/15 border-gold/40 text-gold font-bold'
                                            : 'bg-slate-800 border-slate-700/60 hover:bg-slate-800/60 text-slate-300'
                                        }`}
                                      >
                                        <div
                                          className="absolute left-0 top-0 bottom-0 bg-gold/10 transition-all duration-500"
                                          style={{ width: `${percent}%` }}
                                        />
                                        <div className="relative flex justify-between items-center">
                                          <span>{opt.optionText}</span>
                                          <span className="font-mono text-[10px] text-slate-400">{percent}% ({voteCount})</span>
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : containsEvent ? (
                              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-left min-w-[260px] flex gap-3">
                                <div className="p-3 bg-gold/10 border border-gold/30 rounded-lg text-gold self-start">
                                  <Calendar size={18} />
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono uppercase font-bold">
                                      {msg.event?.type}
                                    </span>
                                  </div>
                                  <h4 className="text-xs font-bold text-white mt-1">{msg.event?.title}</h4>
                                  <p className="text-[10px] text-slate-400 font-medium mt-1 font-mono">
                                    Date: {new Date(msg.event!.date).toLocaleDateString()} | Time: {msg.event?.time}
                                  </p>
                                  <button
                                    onClick={() => alert('Attendance Logged - Reminder configured')}
                                    className="mt-3 bg-gold hover:bg-gold-light text-slate-dark text-[10px] font-bold px-3 py-1.5 rounded transition-colors"
                                  >
                                    Register Attendance
                                  </button>
                                </div>
                              </div>
                            ) : containsVoice ? (
                              <div className="bg-slate-800 border border-slate-700/80 px-4 py-2.5 rounded-xl flex items-center gap-3 min-w-[220px]">
                                <button
                                  onClick={() => setPlayingAudioId(playingAudioId === msg._id ? null : msg._id)}
                                  className="w-8 h-8 rounded-full bg-gold/10 text-gold flex items-center justify-center hover:bg-gold/20 transition-all"
                                >
                                  {playingAudioId === msg._id ? <Pause size={14} /> : <Play size={14} />}
                                </button>
                                <div className="flex-1">
                                  <div className="flex items-end gap-0.5 h-6">
                                    {msg.voiceNote?.waveform.map((h: number, hIdx: number) => (
                                      <div
                                        key={hIdx}
                                        className={`w-[3px] rounded-t-sm transition-all ${
                                          playingAudioId === msg._id ? 'bg-gold animate-pulse' : 'bg-slate-600'
                                        }`}
                                        style={{ height: `${h}%` }}
                                      />
                                    ))}
                                  </div>
                                  <span className="text-[9px] text-slate-500 font-mono mt-1 block">
                                    Voice Memo • {msg.voiceNote?.duration}s
                                  </span>
                                </div>
                              </div>
                            ) : containsVideo ? (
                              <div className="relative w-40 h-40 rounded-full border border-slate-700 overflow-hidden shadow-lg self-start">
                                <video
                                  src={msg.videoMessage?.videoUrl}
                                  className="w-full h-full object-cover rounded-full"
                                  autoPlay
                                  loop
                                  muted
                                  playsInline
                                />
                                <div className="absolute bottom-2 left-0 right-0 text-center bg-black/40 py-0.5">
                                  <span className="text-[8px] text-white font-mono uppercase tracking-wider">Video Msg</span>
                                </div>
                              </div>
                            ) : (
                              <div className={`p-3.5 rounded-2xl text-xs text-left ${
                                isMe ? 'bg-gold text-slate-dark rounded-tr-none font-medium' : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700/60'
                              }`}>
                                <p className="leading-relaxed whitespace-pre-wrap">{isDeleted ? 'Deleted message' : msg.content}</p>

                                {/* Attachments rendering */}
                                {msg.attachments?.length > 0 && (
                                  <div className="mt-2.5 space-y-1.5 border-t border-slate-700/40 pt-2">
                                    {msg.attachments.map((fileData: any, fIdx: number) => {
                                      const isImage = fileData.fileType === 'image';
                                      const isVideo = fileData.fileType === 'video';
                                      
                                      if (isImage) {
                                        return (
                                          <img
                                            key={fIdx}
                                            src={fileData.fileUrl}
                                            alt={fileData.name}
                                            className="max-h-40 w-auto rounded object-cover border border-slate-800 mt-1"
                                          />
                                        );
                                      } else if (isVideo) {
                                        return (
                                          <video
                                            key={fIdx}
                                            src={fileData.fileUrl}
                                            controls
                                            className="max-h-40 w-auto rounded border border-slate-800 mt-1"
                                          />
                                        );
                                      } else {
                                        return (
                                          <a
                                            key={fIdx}
                                            href={fileData.fileUrl}
                                            download
                                            className="flex items-center gap-2 bg-slate-900/40 p-2 rounded text-[10px] text-slate-300 hover:text-white transition-colors"
                                          >
                                            <Paperclip size={12} className="text-gold" />
                                            <span className="truncate flex-1 font-semibold">{fileData.name}</span>
                                            <Download size={12} />
                                          </a>
                                        );
                                      }
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input Dock panel */}
                  <div className="p-4 bg-slate-900/60 border-t border-slate-800/60 flex flex-col gap-2 flex-shrink-0">
                    
                    {/* Reply metadata indicators */}
                    {replyMessage && (
                      <div className="bg-slate-800/40 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center justify-between">
                        <div className="text-[10px] text-slate-400">
                          Replying to <span className="font-bold text-gold">@{replyMessage.sender?.firstName}</span>: {replyMessage.content}
                        </div>
                        <button onClick={() => setReplyMessage(null)} className="text-[10px] text-slate-500 hover:text-white">✕</button>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800/80 flex-1">
                        
                        {/* Audio record stub trigger */}
                        <button
                          onClick={triggerAudioRecord}
                          className={`p-2 rounded-lg text-slate-400 hover:text-gold transition-colors ${
                            audioRecording ? 'bg-red-500/20 text-red-400 animate-pulse' : 'hover:bg-slate-800'
                          }`}
                          title="Record Voice Note"
                        >
                          <Mic size={16} />
                        </button>

                        {/* Video circular record stub trigger */}
                        <button
                          onClick={triggerVideoRecord}
                          className={`p-2 rounded-lg text-slate-400 hover:text-gold transition-colors ${
                            videoRecording ? 'bg-red-500/20 text-red-400 animate-pulse' : 'hover:bg-slate-800'
                          }`}
                          title="Record Circular Video"
                        >
                          <Video size={16} />
                        </button>

                        <input
                          type="text"
                          value={typedMessage}
                          onChange={(e) => setTypedMessage(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSendTextMessage();
                          }}
                          placeholder={
                            audioRecording ? `Recording Voice Memo... [${audioTimer}s] Click Mic to Finish` :
                            videoRecording ? `Recording Circular Video... [${videoTimer}s] Click Camera to Finish` :
                            "Type operations message, announce or attach SOP..."
                          }
                          disabled={audioRecording || videoRecording}
                          className="flex-1 bg-transparent border-none outline-none text-xs text-slate-300 px-3"
                        />

                        {/* Attach media file input */}
                        <label className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-gold transition-colors cursor-pointer" title="Attach Media">
                          <Paperclip size={16} />
                          <input type="file" onChange={handleFileUpload} className="hidden" />
                        </label>

                        {/* Poll generator modal trigger */}
                        <button
                          onClick={() => setShowPollModal(true)}
                          className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-gold transition-colors"
                          title="Create Live Poll"
                        >
                          <BarChart2 size={16} />
                        </button>

                        {/* Event webinar schedule trigger */}
                        <button
                          onClick={() => setShowEventModal(true)}
                          className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-gold transition-colors"
                          title="Schedule Webinar / Meeting"
                        >
                          <Calendar size={16} />
                        </button>

                        {/* Appreciation card creator - Managers Only */}
                        {['ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER'].includes(user?.role || '') && (
                          <button
                            onClick={() => setShowAppreciationModal(true)}
                            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-gold transition-colors"
                            title="Award Appreciation Card"
                          >
                            <Trophy size={16} />
                          </button>
                        )}
                      </div>

                      <button
                        onClick={handleSendTextMessage}
                        className="bg-gold text-slate-dark w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow hover:bg-gold-light gold-glow transition-all"
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                  <MessageSquare size={48} className="text-slate-700 animate-pulse mb-3" />
                  <p className="text-xs">Select a channel or create a group to start operations chat.</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* =================================== TAB 2: SOCIAL WALL =================================== */}
        {activeTab === 'social' && (
          <div className="flex-1 flex flex-col md:flex-row gap-4 overflow-y-auto md:overflow-hidden min-h-0">
            {/* Feed Left Box - Create Post */}
            <div className="w-full md:w-96 bg-card-dark border border-slate-800 rounded-xl p-5 self-start space-y-4">
              <h3 className="text-xs font-bold text-gold uppercase tracking-wider">Share an Achievement</h3>
              
              <div className="space-y-3">
                <textarea
                  value={socialContent}
                  onChange={(e) => setSocialContent(e.target.value)}
                  placeholder="What achievement did you hit today? Write a LinkedIn-style corporate update..."
                  className="w-full h-28 bg-slate-950/60 border border-slate-800 rounded-lg p-3 text-xs text-slate-300 focus:border-gold outline-none resize-none"
                />

                <div className="space-y-2">
                  <label className="block text-[10px] text-slate-500 font-bold uppercase">Image / Media URL</label>
                  <input
                    type="text"
                    value={socialMediaUrl}
                    onChange={(e) => setSocialMediaUrl(e.target.value)}
                    placeholder="https://cloudinary.com/evidence-pic.jpg"
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-gold outline-none"
                  />
                  {socialMediaUrl && (
                    <select
                      value={socialMediaType}
                      onChange={(e: any) => setSocialMediaType(e.target.value)}
                      className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-gold outline-none"
                    >
                      <option value="none">Choose Type</option>
                      <option value="image">Image Attachment</option>
                      <option value="video">Video Attachment</option>
                    </select>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] text-slate-500 font-bold uppercase">Award Badge (Optional)</label>
                  <input
                    type="text"
                    value={socialAchievementTitle}
                    onChange={(e) => setSocialAchievementTitle(e.target.value)}
                    placeholder="Elite performer, Top Sales..."
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-gold outline-none font-semibold text-gold"
                  />
                </div>

                <button
                  onClick={handleSocialSubmit}
                  className="w-full bg-gold hover:bg-gold-light text-slate-dark text-xs font-bold py-2.5 rounded-lg shadow gold-glow transition-all"
                >
                  Publish to Wall
                </button>
              </div>
            </div>

            {/* Social Feed List */}
            <div className="flex-1 md:overflow-y-auto space-y-4 pr-1">
              {store.socialPosts.length > 0 ? (
                store.socialPosts.map((post) => (
                  <div key={post._id} className="bg-card-dark border border-slate-800 rounded-xl p-5 shadow-lg">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-slate-800 border border-gold/30 flex items-center justify-center font-bold text-gold">
                        {post.author?.photoUrl ? (
                          <img src={post.author.photoUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          post.author?.firstName?.charAt(0) || 'U'
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-white">{post.author?.firstName} {post.author?.lastName}</h4>
                          <span className="text-[8px] bg-slate-800 text-gold px-1.5 py-0.5 rounded font-bold uppercase tracking-wider font-mono">
                            {post.author?.role}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-semibold">{post.author?.department || 'OXY Partner'}</p>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="space-y-3">
                      <p className="text-xs leading-relaxed text-slate-300 whitespace-pre-line">{post.content}</p>

                      {/* Achievement badge */}
                      {post.achievement?.title && (
                        <div className="flex items-center gap-2 bg-gold/10 border border-gold/30 p-2.5 rounded-lg text-gold font-bold self-start w-fit">
                          <Trophy size={14} />
                          <span className="text-[10px] tracking-wider uppercase">Badge Earned: {post.achievement.title}</span>
                        </div>
                      )}

                      {/* Attachment */}
                      {post.mediaUrls?.length > 0 && (
                        <div className="rounded-lg overflow-hidden border border-slate-800">
                          {post.mediaType === 'image' ? (
                            <img src={post.mediaUrls[0]} alt="Media" className="max-h-96 w-full object-cover" />
                          ) : (
                            <video src={post.mediaUrls[0]} controls className="max-h-96 w-full" />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Reacts */}
                    <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-800/60">
                      <button
                        onClick={() => store.reactSocialPost(post._id, 'like')}
                        className={`flex items-center gap-1.5 text-xs ${
                          post.reactions.some((r) => r.user.toString() === user?.id && r.type === 'like')
                            ? 'text-gold font-bold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <ThumbsUp size={13} />
                        Like ({post.reactions.filter((r) => r.type === 'like').length})
                      </button>

                      <button
                        onClick={() => store.reactSocialPost(post._id, 'celebrate')}
                        className={`flex items-center gap-1.5 text-xs ${
                          post.reactions.some((r) => r.user.toString() === user?.id && r.type === 'celebrate')
                            ? 'text-gold font-bold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Sparkles size={13} className="text-gold" />
                        Celebrate ({post.reactions.filter((r) => r.type === 'celebrate').length})
                      </button>

                      <button
                        onClick={() => store.reactSocialPost(post._id, 'insightful')}
                        className={`flex items-center gap-1.5 text-xs ${
                          post.reactions.some((r) => r.user.toString() === user?.id && r.type === 'insightful')
                            ? 'text-gold font-bold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Lightbulb size={13} />
                        Insightful ({post.reactions.filter((r) => r.type === 'insightful').length})
                      </button>
                    </div>

                    {/* Comments section */}
                    <div className="mt-4 pt-4 border-t border-slate-800/60 space-y-3">
                      {post.comments?.map((c, cIdx) => (
                        <div key={c._id || cIdx} className="flex gap-2.5 items-start text-xs bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/30">
                          <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center font-bold text-gold text-[10px] flex-shrink-0">
                            {c.user?.firstName?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-300">{c.user?.firstName} {c.user?.lastName}</span>
                              <span className="text-[8px] text-slate-500">
                                {new Date(c.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-slate-400 mt-1 leading-normal">{c.content}</p>
                          </div>
                        </div>
                      ))}

                      {/* Comment Input */}
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="text"
                          placeholder="Write a supportive comment..."
                          value={commentInput[post._id] || ''}
                          onChange={(e) => setCommentInput({ ...commentInput, [post._id]: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSocialCommentSubmit(post._id);
                          }}
                          className="flex-1 bg-slate-950/60 text-xs px-3 py-2 rounded-lg border border-slate-800 focus:border-gold outline-none"
                        />
                        <button
                          onClick={() => handleSocialCommentSubmit(post._id)}
                          className="bg-gold text-slate-dark text-xs font-bold px-3 py-2 rounded-lg hover:bg-gold-light transition-all"
                        >
                          Comment
                        </button>
                      </div>
                    </div>

                  </div>
                ))
              ) : (
                <div className="text-slate-500 py-12 text-center text-xs">No updates shared on social wall yet.</div>
              )}
            </div>
          </div>
        )}

        {/* =================================== TAB 3: KNOWLEDGE BASE =================================== */}
        {activeTab === 'knowledge' && (
          <div className="flex-1 flex flex-col gap-4 overflow-hidden min-h-0 relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
              <div className="flex flex-wrap items-center gap-2">
                {['SOP', 'Training', 'Tip', 'Document'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setSopCategory(cat as any);
                      store.fetchKnowledgeItems({ category: cat });
                    }}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
                      sopCategory === cat
                        ? 'bg-gold border-gold text-slate-dark shadow font-extrabold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Publish SOP button - Admins / Managers */}
              {['ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER'].includes(user?.role || '') && (
                <button
                  onClick={() => setShowSopModal(true)}
                  className="flex items-center gap-2 bg-gold hover:bg-gold-light text-slate-dark text-xs font-bold px-4 py-2 rounded-xl gold-glow transition-all"
                >
                  <Plus size={14} />
                  Publish SOP
                </button>
              )}
            </div>

            {/* SOP list grid */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
              {store.knowledgeItems.map((item) => (
                <div
                  key={item._id}
                  onClick={() => setSelectedSopItem(item)}
                  className="bg-card-dark border border-slate-800 hover:border-gold/30 rounded-xl p-5 cursor-pointer hover:shadow-lg transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[9px] bg-gold/10 text-gold border border-gold/30 px-2 py-0.5 rounded font-extrabold uppercase font-mono">
                        {item.category}
                      </span>
                      {item.department && (
                        <span className="text-[9px] bg-slate-950 text-slate-400 px-2 py-0.5 rounded font-mono">
                          {item.department}
                        </span>
                      )}
                    </div>
                    
                    <h3 className="text-xs font-bold text-white mb-2 line-clamp-1">{item.title}</h3>
                    <p className="text-[10px] text-slate-400 line-clamp-3 leading-relaxed mb-4">{item.content}</p>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-800/60 pt-3 text-[10px] text-slate-500 font-semibold uppercase">
                    <span>By: {item.author?.firstName} {item.author?.lastName}</span>
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* SOP Reader Details Overlay Modal */}
            {selectedSopItem && (
              <div className="absolute inset-0 bg-slate-dark/95 border border-slate-850 rounded-xl p-6 overflow-y-auto flex flex-col justify-between z-20">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] bg-gold/25 border border-gold/40 text-gold px-2.5 py-0.5 rounded font-bold uppercase">
                        {selectedSopItem.category}
                      </span>
                      <h2 className="text-xs font-bold text-white uppercase tracking-wider">{selectedSopItem.title}</h2>
                    </div>
                    <button
                      onClick={() => setSelectedSopItem(null)}
                      className="text-slate-400 hover:text-white text-xs bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg"
                    >
                      Close
                    </button>
                  </div>

                  <div className="prose prose-invert max-w-none text-slate-300 text-xs leading-relaxed whitespace-pre-wrap">
                    {selectedSopItem.content}
                  </div>

                  {selectedSopItem.attachments?.length > 0 && (
                    <div className="mt-8 border-t border-slate-800/80 pt-4">
                      <h4 className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2">Attached Reference Manuals</h4>
                      {selectedSopItem.attachments.map((att: any, aIdx: number) => (
                        <a
                          key={aIdx}
                          href={att.fileUrl}
                          download
                          className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-3 rounded-lg text-xs hover:text-gold w-fit transition-colors"
                        >
                          <Paperclip size={14} className="text-gold" />
                          <span>{att.name}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =================================== TAB 4: ENGAGEMENT ANALYTICS =================================== */}
        {activeTab === 'analytics' && (
          <div className="flex-grow flex flex-col gap-6 overflow-y-auto pb-4">
            
            {/* Quick Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-card-dark border border-slate-800 rounded-xl p-5 shadow flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Messages Sent</p>
                  <h3 className="text-xl font-bold text-gold mt-1 font-mono">1,482</h3>
                </div>
                <MessageSquare className="text-gold opacity-30" size={32} />
              </div>
              <div className="bg-card-dark border border-slate-800 rounded-xl p-5 shadow flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Active Employees</p>
                  <h3 className="text-xl font-bold text-gold mt-1 font-mono">34</h3>
                </div>
                <Users className="text-gold opacity-30" size={32} />
              </div>
              <div className="bg-card-dark border border-slate-800 rounded-xl p-5 shadow flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Audit logs generated</p>
                  <h3 className="text-xl font-bold text-gold mt-1 font-mono">89</h3>
                </div>
                <CheckSquare className="text-gold opacity-30" size={32} />
              </div>
            </div>

            {/* Department metrics leaderboard stubs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-card-dark border border-slate-800 rounded-xl p-5 shadow">
                <h3 className="text-xs font-bold text-white mb-4 uppercase tracking-wider">Most Active Departments</h3>
                <div className="space-y-3">
                  {[
                    { dept: 'Front Office', count: 420, percent: 80 },
                    { dept: 'Housekeeping', count: 310, percent: 62 },
                    { dept: 'Kitchen Operations', count: 210, percent: 42 },
                    { dept: 'Human Resources', count: 180, percent: 36 }
                  ].map((item, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-slate-300">
                        <span>{item.dept}</span>
                        <span>{item.count} messages</span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-2">
                        <div className="bg-gold h-2 rounded-full" style={{ width: `${item.percent}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top employees ranking */}
              <div className="bg-card-dark border border-slate-800 rounded-xl p-5 shadow">
                <h3 className="text-xs font-bold text-white mb-4 uppercase tracking-wider">Top Contributors Leaderboard</h3>
                <div className="space-y-3">
                  {[
                    { name: 'Elena Rostova', dept: 'HR Manager', xp: '180 Posts' },
                    { name: 'Marcus Aurelius', dept: 'Senior HR Manager', xp: '142 Posts' },
                    { name: 'Sarah Jenkins', dept: 'Front Office Manager', xp: '110 Posts' },
                    { name: 'David Miller', dept: 'Guest Agent', xp: '82 Posts' }
                  ].map((emp, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/30">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded bg-gold/10 text-gold flex items-center justify-center font-bold text-[10px]">
                          {idx + 1}
                        </div>
                        <span className="font-bold text-slate-200">{emp.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{emp.xp}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* =================================== MODALS OVERLAY DIALOGS =================================== */}
      
      {/* 1. Create Group Modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card-dark border border-slate-800/80 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-xs font-bold text-gold uppercase tracking-wider">Create Group Chat / Channel</h3>
            
            <div className="space-y-3 text-left">
              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Group Name</label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. Housekeeping Team"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-gold outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Group Type</label>
                <select
                  value={newGroupType}
                  onChange={(e) => setNewGroupType(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-gold outline-none"
                >
                  <option value="PublicGroup">Public Group</option>
                  <option value="PrivateGroup">Private Group</option>
                  <option value="DepartmentGroup">Department Group</option>
                  <option value="HotelGroup">Hotel Group</option>
                  <option value="ProjectGroup">Project Group</option>
                  <option value="AnnouncementChannel">Announcement Channel</option>
                </select>
              </div>

              {newGroupType === 'DepartmentGroup' && (
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Department</label>
                  <input
                    type="text"
                    value={newGroupDept}
                    onChange={(e) => setNewGroupDept(e.target.value)}
                    placeholder="e.g. Housekeeping"
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-gold outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Description</label>
                <input
                  type="text"
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="e.g. Operations sync"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-gold outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setShowCreateGroup(false)}
                className="bg-slate-800 hover:bg-slate-700 text-xs font-bold px-4 py-2 rounded-lg text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleGroupCreateSubmit}
                className="bg-gold hover:bg-gold-light text-slate-dark text-xs font-bold px-4 py-2 rounded-lg"
              >
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Poll creator Modal */}
      {showPollModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card-dark border border-slate-800/80 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-xs font-bold text-gold uppercase tracking-wider">Create a Poll</h3>
            
            <div className="space-y-3 text-left">
              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Question</label>
                <input
                  type="text"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder="Who will attend the SOP training?"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-gold outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] text-slate-500 font-bold uppercase">Options</label>
                {pollOptions.map((opt, idx) => (
                  <input
                    key={idx}
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const updated = [...pollOptions];
                      updated[idx] = e.target.value;
                      setPollOptions(updated);
                    }}
                    placeholder={`Option ${idx + 1}`}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-gold outline-none"
                  />
                ))}
                
                {pollOptions.length < 5 && (
                  <button
                    onClick={() => setPollOptions([...pollOptions, ''])}
                    className="text-[10px] text-gold font-bold uppercase hover:text-gold-light"
                  >
                    + Add Option Option
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setShowPollModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-xs font-bold px-4 py-2 rounded-lg text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handlePollSubmit}
                className="bg-gold hover:bg-gold-light text-slate-dark text-xs font-bold px-4 py-2 rounded-lg"
              >
                Launch Poll
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Event schedule Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card-dark border border-slate-800/80 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-xs font-bold text-gold uppercase tracking-wider">Schedule Event / Meeting</h3>
            
            <div className="space-y-3 text-left">
              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Title</label>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="Sanitation SOP Training Session"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-gold outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Meeting Type</label>
                <select
                  value={eventType}
                  onChange={(e: any) => setEventType(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-gold outline-none"
                >
                  <option value="Meeting">Operational Meeting</option>
                  <option value="Webinar">Webinar</option>
                  <option value="Training">Training Session</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Date</label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-gold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Time</label>
                  <input
                    type="text"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    placeholder="11:30 AM"
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-gold outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setShowEventModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-xs font-bold px-4 py-2 rounded-lg text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleEventSubmit}
                className="bg-gold hover:bg-gold-light text-slate-dark text-xs font-bold px-4 py-2 rounded-lg"
              >
                Save Event
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Appreciation Award Modal */}
      {showAppreciationModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card-dark border border-slate-800/80 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-xs font-bold text-gold uppercase tracking-wider">Award Employee Appreciation Card</h3>
            
            <div className="space-y-3 text-left">
              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Award Recipient</label>
                <select
                  value={awardRecipient}
                  onChange={(e) => setAwardRecipient(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-gold outline-none font-semibold text-white"
                >
                  <option value="">Select Employee...</option>
                  {recipientList.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.firstName} {emp.lastName} ({emp.department} • {emp.designation})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Award Category</label>
                <select
                  value={awardType}
                  onChange={(e: any) => setAwardType(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-gold outline-none"
                >
                  <option value="EmployeeOfMonth">Employee of the Month</option>
                  <option value="StarPerformer">Star Performer</option>
                  <option value="ElitePerformer">Elite Performer</option>
                  <option value="TopSalesPerformer">Top Sales Performer</option>
                  <option value="BestHousekeepingStaff">Best Housekeeping Staff</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Award Details</label>
                <textarea
                  value={awardDetails}
                  onChange={(e) => setAwardDetails(e.target.value)}
                  placeholder="Details of the achievements (e.g. Completed all sanitary audits with 100% compliance rate)..."
                  className="w-full h-24 bg-slate-950/60 border border-slate-800 rounded-lg p-3 text-xs text-slate-300 focus:border-gold outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setShowAppreciationModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-xs font-bold px-4 py-2 rounded-lg text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleAppreciationSubmit}
                className="bg-gold hover:bg-gold-light text-slate-dark text-xs font-bold px-4 py-2 rounded-lg"
              >
                Issue Award
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. SOP Upload Modal */}
      {showSopModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card-dark border border-slate-800/80 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-xs font-bold text-gold uppercase tracking-wider">Publish SOP Document</h3>
            
            <div className="space-y-3 text-left">
              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Title</label>
                <input
                  type="text"
                  value={sopTitle}
                  onChange={(e) => setSopTitle(e.target.value)}
                  placeholder="e.g. Front Office VIP Check-in Protocols"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-gold outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Category</label>
                <select
                  value={sopCategory}
                  onChange={(e: any) => setSopCategory(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-gold outline-none"
                >
                  <option value="SOP">SOP Manual</option>
                  <option value="Training">Training Asset</option>
                  <option value="Tip">Operations Tip</option>
                  <option value="Document">Reference Document</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Department</label>
                  <input
                    type="text"
                    value={sopDept}
                    onChange={(e) => setSopDept(e.target.value)}
                    placeholder="e.g. Front Office"
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-gold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Tags (Comma Sep)</label>
                  <input
                    type="text"
                    value={sopTags}
                    onChange={(e) => setSopTags(e.target.value)}
                    placeholder="frontdesk, guest, safety"
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-gold outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">SOP Content (Markdown Supported)</label>
                <textarea
                  value={sopContent}
                  onChange={(e) => setSopContent(e.target.value)}
                  placeholder="Write the SOP manual steps here..."
                  className="w-full h-28 bg-slate-950/60 border border-slate-800 rounded-lg p-3 text-xs text-slate-300 focus:border-gold outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Attachment File URL</label>
                  <input
                    type="text"
                    value={sopAttachmentUrl}
                    onChange={(e) => setSopAttachmentUrl(e.target.value)}
                    placeholder="https://docs.com/sop.pdf"
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-gold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Attachment Name</label>
                  <input
                    type="text"
                    value={sopAttachmentName}
                    onChange={(e) => setSopAttachmentName(e.target.value)}
                    placeholder="Download PDF Guide"
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-gold outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setShowSopModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-xs font-bold px-4 py-2 rounded-lg text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSopSubmit}
                className="bg-gold hover:bg-gold-light text-slate-dark text-xs font-bold px-4 py-2 rounded-lg"
              >
                Publish Document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Realtime Call Dialing Overlay Modal Stub */}
      {activeCall && (
        <div className="fixed top-8 right-8 bg-slate-900 border-2 border-gold rounded-2xl p-5 shadow-2xl z-50 w-72 space-y-4 gold-glow">
          <div className="flex justify-between items-center border-b border-slate-850 pb-2">
            <span className="text-[10px] uppercase font-bold text-gold tracking-wider font-mono">Live Call Connected</span>
            <button onClick={() => setActiveCall(null)} className="text-slate-500 hover:text-white">✕</button>
          </div>

          <div className="flex flex-col items-center py-4 space-y-3">
            <div className="w-16 h-16 rounded-full bg-gold/15 border-2 border-gold text-gold flex items-center justify-center animate-pulse">
              {activeCall.type === 'video' ? <Video size={24} /> : <PhoneCall size={24} />}
            </div>
            <div className="text-center">
              <h4 className="text-xs font-bold text-white uppercase">{activeCall.channel}</h4>
              <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">Multi-User Agora WebRTC Tunnel</p>
            </div>
          </div>

          <button
            onClick={() => setActiveCall(null)}
            className="w-full bg-red-600 hover:bg-red-500 text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-2"
          >
            <VideoOff size={14} />
            End Call Channel
          </button>
        </div>
      )}

    </div>
  );
}
