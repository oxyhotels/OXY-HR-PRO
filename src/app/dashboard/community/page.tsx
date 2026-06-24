'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';
import { useCommunityStore, ZustandGroup, ZustandMessage, ZustandSocialPost, ZustandKnowledgeItem } from '@/store/communityStore';
import { api } from '@/lib/api';
import { DEPARTMENTS } from '@/constants/departments';
import {
  MessageSquare, Send, Plus, FileText, Image as ImageIcon, Video, Mic,
  Calendar, Trophy, Search, Award, Sparkles, Play, Pause, Lightbulb,
  BookOpen, Download, BarChart2, Paperclip, Check, CheckCheck, CheckSquare,
  Users, VideoOff, PhoneCall, Phone, PhoneOff, ArrowLeft, X
} from 'lucide-react';

let alarmAudio: HTMLAudioElement | null = null;
const playAlarm = (loop = false) => {
  try {
    if (!alarmAudio) alarmAudio = new Audio('/alerm sound.mp3');
    alarmAudio.loop = loop;
    alarmAudio.currentTime = 0;
    alarmAudio.play().catch(() => {});
  } catch (_) {}
};
const stopAlarm = () => {
  try { if (alarmAudio) { alarmAudio.pause(); alarmAudio.currentTime = 0; } } catch (_) {}
};

const compressAndResizeImage = (file: File, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<{ blob: Blob; thumbnailBlob: Blob }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = 128;
        thumbCanvas.height = 128;
        const tCtx = thumbCanvas.getContext('2d');
        
        const size = Math.min(img.width, img.height);
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;
        tCtx?.drawImage(img, sx, sy, size, size, 0, 0, 128, 128);

        canvas.toBlob((blob) => {
          thumbCanvas.toBlob((tBlob) => {
            if (blob && tBlob) {
              resolve({ blob, thumbnailBlob: tBlob });
            } else {
              reject(new Error('Canvas blob generation failed'));
            }
          }, 'image/jpeg', 0.8);
        }, 'image/jpeg', quality);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

const uploadCompressedImage = async (file: File): Promise<string> => {
  const { blob } = await compressAndResizeImage(file);
  const formData = new FormData();
  formData.append('file', new File([blob], 'icon.jpg', { type: 'image/jpeg' }));
  const res = await fetch('/api/community/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${useAuthStore.getState().accessToken}`
    },
    body: formData
  });
  const data = await res.json();
  if (data.status === 'success') {
    return data.data.fileUrl;
  } else {
    throw new Error(data.message || 'Upload failed');
  }
};

const renderMessageContent = (content?: string) => {
  if (!content) return null;
  // Regex to match @all or @username
  const parts = content.split(/(@all|@[a-zA-Z0-9_]+)/gi);
  return (
    <>
      {parts.map((part, i) => {
        if (part.toLowerCase() === '@all') {
          return <span key={i} className="font-bold text-gold bg-gold/10 px-1 rounded mx-0.5">{part}</span>;
        } else if (part.startsWith('@')) {
          return <span key={i} className="font-semibold text-gold bg-[#1b223c] px-1 rounded mx-0.5">{part}</span>;
        }
        return part;
      })}
    </>
  );
};

export default function CommunityHubPage() {
  const { user } = useAuthStore();
  const store = useCommunityStore();

  const [activeTab, setActiveTab] = useState<'chat' | 'social' | 'knowledge' | 'analytics'>('chat');
  const [mobileShowSidebar, setMobileShowSidebar] = useState(true);
  const [departmentsList, setDepartmentsList] = useState<string[]>(Array.from(DEPARTMENTS));
  const [socket, setSocket] = useState<Socket | null>(null);
  const [typedMessage, setTypedMessage] = useState('');
  const [replyMessage, setReplyMessage] = useState<ZustandMessage | null>(null);
  const [isTypingState, setIsTypingState] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupType, setNewGroupType] = useState<string>('PublicGroup');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupDept, setNewGroupDept] = useState('');
  const [groupSelectionMode, setGroupSelectionMode] = useState<'department' | 'manager' | 'employee'>('employee');
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [selectedManagers, setSelectedManagers] = useState<string[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [autoSyncDept, setAutoSyncDept] = useState(false);
  const [groupIcon, setGroupIcon] = useState('');
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [incomingCallData, setIncomingCallData] = useState<{callId:string;groupId:string;groupName:string;callType:'voice'|'video';callerName:string}|null>(null);
  const [audioRecording, setAudioRecording] = useState(false);
  const [audioTimer, setAudioTimer] = useState(0);
  const [videoRecording, setVideoRecording] = useState(false);
  const [videoTimer, setVideoTimer] = useState(0);
  const [showAppreciationModal, setShowAppreciationModal] = useState(false);
  const [awardRecipient, setAwardRecipient] = useState('');
  const [awardType, setAwardType] = useState('EmployeeOfMonth');
  const [awardDetails, setAwardDetails] = useState('');
  const [recipientList, setRecipientList] = useState<any[]>([]);
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventType, setEventType] = useState<'Meeting'|'Webinar'|'Training'>('Meeting');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [socialContent, setSocialContent] = useState('');
  const [socialMediaUrl, setSocialMediaUrl] = useState('');
  const [socialMediaType, setSocialMediaType] = useState<'image'|'video'|'none'>('none');
  const [socialAchievementTitle, setSocialAchievementTitle] = useState('');
  const [commentInput, setCommentInput] = useState<Record<string,string>>({});
  const [showSopModal, setShowSopModal] = useState(false);
  const [sopTitle, setSopTitle] = useState('');
  const [sopContent, setSopContent] = useState('');
  const [sopCategory, setSopCategory] = useState<'SOP'|'Training'|'Tip'|'Document'>('SOP');
  const [sopDept, setSopDept] = useState('');
  const [sopTags, setSopTags] = useState('');
  const [sopAttachmentUrl, setSopAttachmentUrl] = useState('');
  const [sopAttachmentName, setSopAttachmentName] = useState('');
  const [selectedSopItem, setSelectedSopItem] = useState<ZustandKnowledgeItem|null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string|null>(null);

  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [selectedMentions, setSelectedMentions] = useState<string[]>([]);
  const [onlineStatuses, setOnlineStatuses] = useState<Record<string, 'online' | 'away' | 'offline'>>({});
  const [rightSidebarTab, setRightSidebarTab] = useState<'info' | 'members' | 'add' | 'settings'>('info');
  const [addMemberSearchTerm, setAddMemberSearchTerm] = useState('');
  const [showRemoveConfirmId, setShowRemoveConfirmId] = useState<string | null>(null);
  const [isDraggingIcon, setIsDraggingIcon] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDesc, setEditGroupDesc] = useState('');
  const [editGroupIcon, setEditGroupIcon] = useState('');
  const [isUpdatingGroup, setIsUpdatingGroup] = useState(false);

  useEffect(() => {
    if (store.activeGroup) {
      setEditGroupName(store.activeGroup.name || '');
      setEditGroupDesc(store.activeGroup.description || '');
      setEditGroupIcon(store.activeGroup.groupIcon || '');
    }
  }, [store.activeGroup?._id]);

  useEffect(() => {
    const match = typedMessage.match(/@(\w*)$/);
    if (match) {
      setMentionQuery(match[1]);
    } else {
      setMentionQuery(null);
    }
  }, [typedMessage]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get('/organization/public-departments').then(res => {
      if (res?.data?.departments) setDepartmentsList(res.data.departments);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const newSocket = io({ auth: { token: useAuthStore.getState().accessToken } });
    setSocket(newSocket);

    newSocket.on('new_message', (message: ZustandMessage) => {
      const myId = useAuthStore.getState().user?.id;
      const isMyMsg = message.sender?._id === myId || message.sender?.id === myId;
      if (!isMyMsg) {
        // Trigger alert only under Feature 7 conditions
        const isBelongsToGroup = store.groups.some(g => g._id === message.group);
        const isLoggedIn = !!useAuthStore.getState().user;
        const isPermissionGranted = typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';

        if (isBelongsToGroup && isLoggedIn && isPermissionGranted) {
          new Audio("/alerm sound.mp3").play().catch(() => {});
        }

        // Show push/browser alert if mentioned
        const isMentioned = message.content?.toLowerCase().includes(`@${useAuthStore.getState().user?.firstName?.toLowerCase()}`);
        if (isMentioned && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          const browserNotif = new window.Notification(`You were mentioned in community`, {
            body: `${message.sender?.firstName || 'Someone'}: ${message.content}`,
            icon: '/icon.png'
          });
          browserNotif.onclick = () => {
            const el = document.getElementById(`msg-${message._id}`);
            el?.scrollIntoView({ behavior: 'smooth' });
          };
        } else if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          const browserNotif = new window.Notification(`New Message in OXY Community`, {
            body: `${message.sender?.firstName || 'Someone'}: ${message.content || 'Sent an attachment'}`,
            icon: '/icon.png'
          });
          browserNotif.onclick = () => {
            const el = document.getElementById(`msg-${message._id}`);
            el?.scrollIntoView({ behavior: 'smooth' });
          };
        }
      }
      useCommunityStore.getState().addMessage(message);
    });

    newSocket.on('message_updated', (msg: ZustandMessage) => useCommunityStore.getState().updateMessage(msg));
    newSocket.on('message_deleted', () => {
      const ag = useCommunityStore.getState().activeGroup;
      if (ag) useCommunityStore.getState().fetchMessages(ag._id);
    });
    newSocket.on('user_added_to_group', (newGroup: ZustandGroup) => {
      useCommunityStore.getState().fetchGroups();
      playAlarm(true);
    });
    newSocket.on('user_typing_start', ({ groupId, userId, name }: any) => useCommunityStore.getState().setTyping(groupId, userId, name, true));
    newSocket.on('user_typing_stop', ({ groupId, userId }: any) => useCommunityStore.getState().setTyping(groupId, userId, '', false));
    
    newSocket.on('user_status_change', ({ userId, status }: any) => {
      setOnlineStatuses(prev => ({ ...prev, [userId]: status }));
      useCommunityStore.getState().setUserOnline(userId, status === 'online' || status === 'away');
    });

    newSocket.on('incoming_call', (callData: any) => { setIncomingCallData(callData); playAlarm(true); });
    newSocket.on('call_updated', (call: any) => useCommunityStore.getState().setCallUpdated(call));
    newSocket.on('call_ended', (callId: string) => { useCommunityStore.getState().setCallEnded(callId); stopAlarm(); });

    api.get('/community/realtime/online').then(res => {
      useCommunityStore.getState().setOnlineUsers(res.data.onlineUsers || []);
      if (res.data.onlineStatuses) {
        setOnlineStatuses(res.data.onlineStatuses);
      }
    }).catch(() => {});

    return () => { newSocket.disconnect(); };
  }, [store.groups.length]);

  // Client idle status tracking
  useEffect(() => {
    if (!socket || !user) return;

    let idleTimeout: NodeJS.Timeout;
    let currentStatus: 'online' | 'away' = 'online';

    const setStatus = (status: 'online' | 'away') => {
      if (currentStatus !== status) {
        currentStatus = status;
        socket.emit('user_status_set', status);
      }
    };

    const resetIdleTimer = () => {
      setStatus('online');
      clearTimeout(idleTimeout);
      idleTimeout = setTimeout(() => {
        setStatus('away');
      }, 300000); // 5 minutes
    };

    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    activityEvents.forEach(evt => {
      window.addEventListener(evt, resetIdleTimer);
    });

    resetIdleTimer();

    return () => {
      clearTimeout(idleTimeout);
      activityEvents.forEach(evt => {
        window.removeEventListener(evt, resetIdleTimer);
      });
    };
  }, [socket, user]);

  useEffect(() => {
    store.fetchGroups();
    api.get('/employees').then(res => setRecipientList(res.data.employees || [])).catch(console.error);
  }, []);

  useEffect(() => {
    if (activeTab === 'social') store.fetchSocialPosts();
    else if (activeTab === 'knowledge') store.fetchKnowledgeItems();
  }, [activeTab]);

  useEffect(() => {
    if (!socket || !store.activeGroup) return;
    socket.emit('join_group', store.activeGroup._id);
    store.markGroupRead(store.activeGroup._id);
    store.setTyping(store.activeGroup._id, '', '', false);
    return () => { if (store.activeGroup) socket.emit('leave_group', store.activeGroup._id); };
  }, [store.activeGroup?._id, socket]);

  useEffect(() => {
    if (!socket || !store.activeGroup) return;
    if (typedMessage.length > 0) {
      if (!isTypingState) { setIsTypingState(true); socket.emit('typing_start', store.activeGroup._id); }
    } else {
      if (isTypingState) { setIsTypingState(false); socket.emit('typing_stop', store.activeGroup._id); }
    }
  }, [typedMessage]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [store.messages]);

  const handleSendTextMessage = useCallback(() => {
    if (!store.activeGroup || (!typedMessage.trim() && !replyMessage)) return;
    const payload: any = { content: typedMessage };
    if (replyMessage) payload.parentMessage = replyMessage._id;
    if (selectedMentions.length > 0) {
      payload.mentionedUserIds = selectedMentions;
    }
    store.sendMessage(store.activeGroup._id, payload);
    setTypedMessage(''); setReplyMessage(null); setSelectedMentions([]);
    inputRef.current?.focus();
  }, [store.activeGroup, typedMessage, replyMessage, selectedMentions]);

  const getNonGroupEmployees = () => {
    const groupMemberIds = new Set(store.activeGroup?.members?.map((m: any) => m.user?._id?.toString() || m.user?.toString()) || []);
    return recipientList.filter(emp => {
      const empIdStr = emp._id?.toString();
      if (groupMemberIds.has(empIdStr)) return false;
      
      const q = addMemberSearchTerm.toLowerCase();
      const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
      const empCode = (emp.employeeId || '').toLowerCase();
      const deptName = (emp.department || '').toLowerCase();
      const mgrName = (emp.reportingManager || '').toLowerCase();
      
      return fullName.includes(q) || empCode.includes(q) || deptName.includes(q) || mgrName.includes(q);
    });
  };

  const handleAddMember = async (userId: string) => {
    if (!store.activeGroup) return;
    try {
      const res = await api.post(`/community/groups/${store.activeGroup._id}/members`, { userId });
      if (res.data.status === 'success') {
        store.selectGroup(res.data.data.group);
        setAddMemberSearchTerm('');
      } else {
        alert(res.data.message || 'Failed to add member');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to add member');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!store.activeGroup) return;
    try {
      const res = await api.delete(`/community/groups/${store.activeGroup._id}/members/${userId}`);
      if (res.data.status === 'success') {
        store.selectGroup(res.data.data.group);
        setShowRemoveConfirmId(null);
      } else {
        alert(res.data.message || 'Failed to remove member');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to remove member');
    }
  };

  const handleUpdateMemberRole = async (userId: string, newRole: 'admin' | 'member') => {
    if (!store.activeGroup) return;
    try {
      const res = await api.put(`/community/groups/${store.activeGroup._id}/members/${userId}/role`, { role: newRole });
      if (res.data.status === 'success') {
        store.selectGroup(res.data.data.group);
      } else {
        alert(res.data.message || 'Failed to update member role');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to update member role');
    }
  };

  const handleUpdateGroupSettings = async () => {
    if (!store.activeGroup || !editGroupName.trim()) return;
    setIsUpdatingGroup(true);
    try {
      const res = await api.put(`/community/groups/${store.activeGroup._id}`, {
        name: editGroupName,
        description: editGroupDesc,
        groupIcon: editGroupIcon
      });
      if (res.data.status === 'success') {
        store.selectGroup(res.data.data.group);
        setRightSidebarTab('info');
        store.fetchGroups();
      } else {
        alert(res.data.message || 'Failed to update group');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to update group');
    } finally {
      setIsUpdatingGroup(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingIcon(true);
  };

  const handleDragLeave = () => {
    setIsDraggingIcon(false);
  };

  const handleDropIcon = async (e: React.DragEvent, target: 'create' | 'edit') => {
    e.preventDefault();
    setIsDraggingIcon(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'].includes(file.type)) {
      alert('Unsupported file format. Please upload JPG, PNG, WEBP, or SVG.');
      return;
    }
    try {
      const uploadedUrl = await uploadCompressedImage(file);
      if (target === 'create') {
        setGroupIcon(uploadedUrl);
      } else {
        setEditGroupIcon(uploadedUrl);
      }
    } catch (err) {
      alert('File upload failed');
    }
  };

  const handleIconFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, target: 'create' | 'edit') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit');
      return;
    }
    try {
      const uploadedUrl = await uploadCompressedImage(file);
      if (target === 'create') {
        setGroupIcon(uploadedUrl);
      } else {
        setEditGroupIcon(uploadedUrl);
      }
    } catch (err) {
      alert('File upload failed');
    }
  };

  const handleSelectMention = (targetUser: any) => {
    const parts = typedMessage.split(/\s/);
    parts[parts.length - 1] = `@${targetUser.firstName} ${targetUser.lastName} `;
    setTypedMessage(parts.join(' '));
    setSelectedMentions((prev) => [...prev, targetUser._id]);
    setMentionQuery(null);
    inputRef.current?.focus();
  };

  const mentionSuggestions = store.activeGroup?.members
    ?.map((m: any) => m.user)
    ?.filter(Boolean)
    ?.filter((u: any) => {
      if (mentionQuery === null) return false;
      const q = mentionQuery.toLowerCase();
      const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
      return fullName.includes(q) || 
             (u.department && u.department.toLowerCase().includes(q)) ||
             (u.designation && u.designation.toLowerCase().includes(q));
    }) || [];

  const handleGroupCreateSubmit = async () => {
    if (!newGroupName.trim()) return;
    await store.createGroup({
      name: newGroupName, type: newGroupType, description: newGroupDesc,
      department: newGroupType === 'DepartmentGroup' ? newGroupDept : undefined,
      selectionMode: groupSelectionMode,
      selectionValues: groupSelectionMode === 'department' ? selectedDepts : groupSelectionMode === 'manager' ? selectedManagers : [],
      memberIds: groupSelectionMode === 'employee' ? selectedEmployees : [],
      autoSyncDept: newGroupType === 'DepartmentGroup' ? autoSyncDept : false,
      groupIcon: groupIcon || undefined
    });
    setNewGroupName(''); setNewGroupDesc(''); setNewGroupDept('');
    setSelectedDepts([]); setSelectedManagers([]); setSelectedEmployees([]);
    setGroupIcon(''); setAutoSyncDept(false); setShowCreateGroup(false);
    store.fetchGroups();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !store.activeGroup) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/community/upload', { method: 'POST', headers: { 'Authorization': `Bearer ${useAuthStore.getState().accessToken}` }, body: formData });
      const data = await res.json();
      if (data.status === 'success') await store.sendMessage(store.activeGroup._id, { attachments: [data.data] });
      else alert(data.message || 'Upload failed');
    } catch (err) { alert('Upload failed'); }
  };

  const triggerAudioRecord = () => {
    if (!audioRecording) {
      setAudioRecording(true); setAudioTimer(0);
      (window as any).audioRecordInterval = setInterval(() => setAudioTimer(p => p + 1), 1000);
    } else {
      clearInterval((window as any).audioRecordInterval); setAudioRecording(false);
      if (store.activeGroup) store.sendMessage(store.activeGroup._id, { voiceNote: { audioUrl: '/uploads/mock-audio.mp3', duration: audioTimer || 8, waveform: Array.from({ length: 24 }, () => Math.floor(Math.random() * 80) + 20) } });
    }
  };

  const triggerVideoRecord = () => {
    if (!videoRecording) {
      setVideoRecording(true); setVideoTimer(0);
      (window as any).videoRecordInterval = setInterval(() => setVideoTimer(p => p + 1), 1000);
    } else {
      clearInterval((window as any).videoRecordInterval); setVideoRecording(false);
      if (store.activeGroup) store.sendMessage(store.activeGroup._id, { videoMessage: { videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-hand-holding-smartphone-recording-video-in-nature-41582-large.mp4', duration: videoTimer || 6 } });
    }
  };

  const handlePollSubmit = () => {
    if (!pollQuestion.trim() || !store.activeGroup) return;
    const opts = pollOptions.filter(o => o.trim()).map(o => ({ optionText: o, votes: [] }));
    if (opts.length < 2) { alert('Please add at least 2 options'); return; }
    store.sendMessage(store.activeGroup._id, { poll: { question: pollQuestion, options: opts, isClosed: false } });
    setPollQuestion(''); setPollOptions(['', '']); setShowPollModal(false);
  };

  const handleEventSubmit = () => {
    if (!eventTitle.trim() || !eventDate || !eventTime || !store.activeGroup) return;
    store.sendMessage(store.activeGroup._id, { event: { title: eventTitle, type: eventType, date: new Date(eventDate), time: eventTime, reminderMinutes: 15, participants: [] } });
    setEventTitle(''); setEventDate(''); setEventTime(''); setShowEventModal(false);
  };

  const handleAppreciationSubmit = () => {
    if (!awardRecipient || !store.activeGroup) return;
    store.sendMessage(store.activeGroup._id, { appreciation: { type: awardType, recipient: awardRecipient, details: awardDetails || 'Outstanding operations capability.' } });
    setAwardRecipient(''); setAwardDetails(''); setShowAppreciationModal(false);
  };

  const handleSocialSubmit = () => {
    if (!socialContent.trim()) return;
    const payload: any = { content: socialContent, mediaUrls: socialMediaUrl ? [socialMediaUrl] : [], mediaType: socialMediaType };
    if (socialAchievementTitle) payload.achievement = { title: socialAchievementTitle };
    store.createSocialPost(payload);
    setSocialContent(''); setSocialMediaUrl(''); setSocialMediaType('none'); setSocialAchievementTitle('');
  };

  const handleSocialCommentSubmit = (postId: string) => {
    const content = commentInput[postId];
    if (!content?.trim()) return;
    store.commentSocialPost(postId, content);
    setCommentInput({ ...commentInput, [postId]: '' });
  };

  const handleSopSubmit = () => {
    if (!sopTitle.trim() || !sopContent.trim()) return;
    store.createKnowledgeItem({ title: sopTitle, content: sopContent, category: sopCategory, department: sopDept || undefined, tags: sopTags.split(',').map(t => t.trim()).filter(Boolean), attachments: sopAttachmentUrl ? [{ name: sopAttachmentName || 'SOP Guide', fileUrl: sopAttachmentUrl }] : [] });
    setSopTitle(''); setSopContent(''); setSopDept(''); setSopTags(''); setSopAttachmentUrl(''); setSopAttachmentName(''); setShowSopModal(false);
  };

  const handleAcceptCall = async () => {
    if (!incomingCallData) return;
    stopAlarm(); await store.joinCall(incomingCallData.callId); setIncomingCallData(null);
  };
  const handleRejectCall = () => { stopAlarm(); setIncomingCallData(null); };

  const filteredMessages = store.messages.filter(msg => !searchTerm || msg.content?.toLowerCase().includes(searchTerm.toLowerCase()));

  const activeGroupTypingStr = () => {
    if (!store.activeGroup) return '';
    const names = Object.values(store.typingUsers[store.activeGroup._id] || {});
    if (names.length === 0) return '';
    if (names.length === 1) return `${names[0]} is typing...`;
    return `${names.slice(0, 2).join(', ')} and others are typing...`;
  };

  const calcPollVotes = (poll: any) => poll.options.reduce((s: number, o: any) => s + (o.votes?.length || 0), 0);

  const getMsgDeliveryIcon = (msg: ZustandMessage) => {
    if (!user) return null;
    const isMe = msg.sender?._id === user.id || msg.sender?.id === user.id;
    if (!isMe) return null;
    const seenByOthers = msg.seenBy?.some((s: any) => s.user?.toString() !== user.id);
    const deliveredToOthers = msg.deliveredTo?.some((d: any) => d.user?.toString() !== user.id);
    if (seenByOthers) return <CheckCheck size={10} className="text-blue-400 flex-shrink-0" />;
    if (deliveredToOthers) return <CheckCheck size={10} className="text-slate-400 flex-shrink-0" />;
    return <Check size={10} className="text-slate-600 flex-shrink-0" />;
  };

  const getLastMsgPreview = (group: ZustandGroup): string => {
    const lm = store.lastMessages[group._id];
    if (!lm) return group.description || group.type;
    if (lm.isDeleted) return '🗑 Message deleted';
    if (lm.poll) return '📊 Poll';
    if (lm.event) return `📅 ${lm.event.title}`;
    if (lm.voiceNote) return '🎤 Voice message';
    if (lm.videoMessage) return '🎥 Video message';
    if (lm.appreciation) return '🏆 Appreciation';
    if (lm.attachments?.length) return `📎 ${lm.attachments[0].name}`;
    return lm.content ? lm.content.substring(0, 45) : '...';
  };

  return (
    <div className="flex flex-col text-slate-100 relative h-[calc(100dvh-7rem)] sm:h-[calc(100vh-7rem)] min-h-[400px]">

      {/* Incoming Call Overlay */}
      {incomingCallData && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0d1b35] border-2 border-gold rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl gold-glow animate-in zoom-in duration-300 space-y-5">
            <div className="relative inline-flex mx-auto">
              <div className="w-20 h-20 rounded-full bg-gold/10 border-4 border-gold flex items-center justify-center">
                {incomingCallData.callType === 'video' ? <Video size={36} className="text-gold" /> : <Phone size={36} className="text-gold" />}
              </div>
              <span className="absolute inset-0 rounded-full border-4 border-gold/40 animate-ping" />
            </div>
            <div>
              <p className="text-[9px] text-gold uppercase tracking-[0.2em] font-bold font-mono mb-1">Incoming {incomingCallData.callType === 'video' ? 'Video' : 'Voice'} Call</p>
              <h2 className="text-lg font-extrabold text-white">{incomingCallData.callerName}</h2>
              <p className="text-xs text-slate-400 mt-1">Group: <span className="text-gold font-semibold">{incomingCallData.groupName}</span></p>
            </div>
            <div className="flex gap-6 justify-center">
              <button onClick={handleRejectCall} className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center active:scale-95" title="Reject"><PhoneOff size={22} className="text-white" /></button>
              <button onClick={handleAcceptCall} className="w-14 h-14 rounded-full bg-green-600 hover:bg-green-500 flex items-center justify-center active:scale-95" title="Accept"><Phone size={22} className="text-white" /></button>
            </div>
          </div>
        </div>
      )}

      {/* Top Tab Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-3 mb-3 gap-2 flex-shrink-0">
        <div className="flex bg-slate-900/60 p-1 rounded-xl border border-slate-800/50 overflow-x-auto whitespace-nowrap">
          {([
            { id: 'chat', label: 'Chat', icon: <MessageSquare size={13} /> },
            { id: 'social', label: 'Social Wall', icon: <Trophy size={13} /> },
            { id: 'knowledge', label: 'Knowledge SOP', icon: <BookOpen size={13} /> },
            { id: 'analytics', label: 'Analytics', icon: <BarChart2 size={13} /> }
          ] as const).map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); if (tab.id === 'chat') setMobileShowSidebar(true); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex-shrink-0 ${activeTab === tab.id ? 'bg-gold text-slate-dark gold-glow' : 'text-slate-400 hover:text-slate-200'}`}>
              {tab.icon}<span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
        <div className="relative flex items-center">
          <Search size={13} className="absolute left-3 text-slate-500 pointer-events-none" />
          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search..."
            className="bg-card-dark text-xs pl-8 pr-3 py-2 w-full sm:w-52 rounded-lg border border-slate-800 focus:border-gold outline-none text-slate-300" />
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden gap-3 min-h-0">

        {/* CHAT TAB */}
        {activeTab === 'chat' && (
          <>
            {/* Sidebar */}
            <div className={`flex-col bg-card-dark border border-slate-800/80 rounded-xl overflow-hidden flex-shrink-0 w-full sm:w-72 lg:w-80 ${mobileShowSidebar ? 'flex' : 'hidden'} sm:flex`}>
              <div className="px-4 py-3 border-b border-slate-800/60 flex items-center justify-between flex-shrink-0">
                <span className="text-xs font-bold text-gold uppercase tracking-wider">OXY Channels</span>
                {['ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER'].includes(user?.role || '') && (
                  <button onClick={() => setShowCreateGroup(true)} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-gold transition-colors" title="Create Group"><Plus size={15} /></button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto py-1.5 px-1 space-y-0.5">
                {store.loading && <div className="text-center text-slate-600 text-xs py-8 animate-pulse">Loading groups...</div>}
                {store.groups.map(g => {
                  const isActive = store.activeGroup?._id === g._id;
                  const isGlobal = g.type === 'GlobalGroup';
                  const isAnnouncement = g.type === 'AnnouncementChannel';
                  const unread = store.unreadCounts[g._id] || 0;
                  const lastMsg = store.lastMessages[g._id];
                  return (
                    <button key={g._id} onClick={() => { store.selectGroup(g); store.markGroupRead(g._id); setMobileShowSidebar(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${isActive ? 'bg-slate-800/90 border-l-2 border-gold text-white' : 'text-slate-400 hover:text-white hover:bg-slate-900/50'}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border font-bold text-sm flex-shrink-0 overflow-hidden ${isGlobal ? 'bg-gold/10 border-gold/40 text-gold' : isAnnouncement ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-slate-800 border-slate-700 text-slate-300'}`}>
                        {g.groupIcon ? <img src={g.groupIcon} alt="" className="w-full h-full object-cover" /> : isGlobal ? '🌐' : isAnnouncement ? '📢' : g.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className={`text-xs font-bold truncate ${unread > 0 ? 'text-white' : ''}`}>{g.name}</p>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {lastMsg && <span className="text-[9px] text-slate-600 font-mono">{new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                            {unread > 0 && <span className="bg-gold text-slate-dark text-[9px] font-extrabold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">{unread > 99 ? '99+' : unread}</span>}
                          </div>
                        </div>
                        <p className={`text-[10px] truncate mt-0.5 ${unread > 0 ? 'text-slate-300 font-semibold' : 'text-slate-500'}`}>{getLastMsgPreview(g)}</p>
                      </div>
                    </button>
                  );
                })}
                {!store.loading && store.groups.length === 0 && <p className="text-center text-slate-600 text-xs py-8">No groups available.</p>}
              </div>
            </div>

            {/* Chat Pane */}
            <div className={`flex-1 flex-col bg-card-dark border border-slate-800/80 rounded-xl overflow-hidden min-w-0 ${!mobileShowSidebar ? 'flex' : 'hidden'} sm:flex`}>
              {store.activeGroup ? (
                <>
                  {/* Chat Header */}
                  <div className="h-14 bg-slate-900/70 border-b border-slate-800/60 px-3 sm:px-4 flex items-center justify-between flex-shrink-0 gap-2">
                    <div onClick={() => { setShowRightSidebar(true); setRightSidebarTab('info'); }} className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer hover:opacity-85">
                      <button onClick={(e) => { e.stopPropagation(); setMobileShowSidebar(true); }} className="sm:hidden p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-gold transition-colors flex-shrink-0 mr-1"><ArrowLeft size={14} /></button>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 overflow-hidden ${store.activeGroup.type === 'GlobalGroup' ? 'bg-gold/10 border border-gold/30 text-gold' : store.activeGroup.type === 'AnnouncementChannel' ? 'bg-red-500/10 border border-red-500/30 text-red-400' : 'bg-slate-800 border border-slate-700 text-slate-300'}`}>
                        {store.activeGroup.groupIcon ? <img src={store.activeGroup.groupIcon} alt="" className="w-full h-full object-cover" /> : store.activeGroup.type === 'GlobalGroup' ? '🌐' : store.activeGroup.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-xs font-bold text-white truncate">{store.activeGroup.name}</h3>
                          <span className="text-[8px] bg-slate-800 px-1 py-0.5 rounded text-gold font-bold uppercase hidden sm:inline-block">{store.activeGroup.type.replace('Group', '')}</span>
                        </div>
                        <p className="text-[9px] truncate">
                          {activeGroupTypingStr() ? <span className="text-gold animate-pulse">{activeGroupTypingStr()}</span> : <span className="text-slate-500">{store.activeGroup.members?.length || 0} members</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button onClick={() => store.startCall(store.activeGroup!._id, 'voice')} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-gold transition-colors" title="Voice Call"><PhoneCall size={14} /></button>
                      <button onClick={() => store.startCall(store.activeGroup!._id, 'video')} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-gold transition-colors" title="Video Call"><Video size={14} /></button>
                      <button onClick={() => setShowRightSidebar(!showRightSidebar)} className={`p-2 rounded-lg transition-all ${showRightSidebar ? 'bg-gold text-slate-dark' : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-gold'}`} title="Group Info"><Users size={14} /></button>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
                    {filteredMessages.map(msg => {
                      const isMe = msg.sender?._id === user?.id || msg.sender?.id === user?.id;
                      const isMentioned = user && msg.sender?._id !== user.id && (
                        msg.content?.toLowerCase().includes('@all') ||
                        msg.content?.toLowerCase().includes(`@${user.firstName.toLowerCase()} ${user.lastName.toLowerCase()}`) ||
                        msg.content?.toLowerCase().includes(`@${user.firstName.toLowerCase()}`)
                      );
                      return (
                        <div key={msg._id} id={`msg-${msg._id}`} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-gold flex-shrink-0 overflow-hidden">
                            {msg.sender?.photoUrl ? <img src={msg.sender.photoUrl} alt="" className="w-full h-full rounded-full object-cover" /> : msg.sender?.firstName?.charAt(0) || 'U'}
                          </div>
                          <div className={`flex flex-col max-w-[80%] sm:max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                            <div className={`flex items-center gap-1.5 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                              <span className="text-[9px] font-bold text-slate-500">{msg.sender?.firstName}</span>
                              <span className="text-[8px] text-slate-600 font-mono">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              {getMsgDeliveryIcon(msg)}
                            </div>
                            {msg.parentMessage && !msg.isDeleted && (
                              <div className={`mb-1 px-2.5 py-1 rounded-lg border text-[9px] text-slate-400 ${isMe ? 'border-gold/20 bg-gold/5' : 'border-slate-700 bg-slate-900/40'}`}>
                                <span className="font-bold text-gold">↩ </span>{(msg.parentMessage as any)?.content?.substring(0, 40) || 'Message'}
                              </div>
                            )}
                            {msg.appreciation ? (
                              <div className="p-4 bg-gradient-to-r from-gold/20 via-gold/10 to-transparent border border-gold/40 rounded-2xl relative overflow-hidden shadow-lg gold-glow text-left min-w-[220px]">
                                <div className="absolute right-2 top-2 text-gold animate-pulse"><Trophy size={22} /></div>
                                <div className="flex items-center gap-1.5 mb-1"><Award className="text-gold" size={13} /><span className="text-[9px] uppercase font-bold text-gold tracking-widest">Appreciation</span></div>
                                <h4 className="text-xs font-extrabold text-white uppercase">{msg.appreciation.type.replace(/([A-Z])/g, ' $1').trim()}</h4>
                                <p className="text-[9px] text-slate-300 font-bold mt-1">Recipient: {msg.appreciation.recipient ? `${msg.appreciation.recipient.firstName} ${msg.appreciation.recipient.lastName}` : 'Employee'}</p>
                                <p className="text-[9px] text-slate-400 mt-0.5 italic">"{msg.appreciation.details}"</p>
                              </div>
                            ) : msg.poll ? (
                              <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-2xl text-left min-w-[220px]">
                                <div className="flex items-center gap-1.5 mb-2"><BarChart2 size={12} className="text-gold" /><span className="text-[9px] text-gold uppercase font-extrabold">Active Poll</span></div>
                                <h4 className="text-xs font-bold text-white mb-3">{msg.poll.question}</h4>
                                <div className="space-y-2">
                                  {msg.poll.options.map((opt: any, optIdx: number) => {
                                    const total = calcPollVotes(msg.poll);
                                    const pct = total > 0 ? Math.round((opt.votes?.length / total) * 100) : 0;
                                    const voted = opt.votes?.some((v: string) => v.toString() === user?.id);
                                    return (
                                      <button key={optIdx} onClick={() => store.votePoll(msg._id, optIdx)} className={`w-full text-left p-2.5 rounded-lg border text-xs relative overflow-hidden transition-all ${voted ? 'bg-gold/15 border-gold/40 text-gold font-bold' : 'bg-slate-800 border-slate-700/60 text-slate-300'}`}>
                                        <div className="absolute left-0 top-0 bottom-0 bg-gold/10" style={{ width: `${pct}%` }} />
                                        <div className="relative flex justify-between"><span>{opt.optionText}</span><span className="font-mono text-[9px] text-slate-400">{pct}%</span></div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : msg.event ? (
                              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-left min-w-[220px] flex gap-3">
                                <div className="p-2.5 bg-gold/10 border border-gold/30 rounded-lg text-gold self-start flex-shrink-0"><Calendar size={15} /></div>
                                <div>
                                  <span className="text-[8px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono uppercase">{msg.event.type}</span>
                                  <h4 className="text-xs font-bold text-white mt-1">{msg.event.title}</h4>
                                  <p className="text-[9px] text-slate-400 font-mono mt-0.5">{new Date(msg.event.date).toLocaleDateString()} | {msg.event.time}</p>
                                  <button onClick={() => alert('Registered!')} className="mt-2 bg-gold text-slate-dark text-[9px] font-bold px-2 py-1 rounded">Register</button>
                                </div>
                              </div>
                            ) : msg.voiceNote ? (
                              <div className="bg-slate-800 border border-slate-700/80 px-4 py-3 rounded-2xl flex items-center gap-3 min-w-[200px]">
                                <button onClick={() => setPlayingAudioId(playingAudioId === msg._id ? null : msg._id)} className="w-8 h-8 rounded-full bg-gold/10 text-gold flex items-center justify-center hover:bg-gold/20 flex-shrink-0">
                                  {playingAudioId === msg._id ? <Pause size={12} /> : <Play size={12} />}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-end gap-0.5 h-6">
                                    {msg.voiceNote.waveform.map((h: number, i: number) => <div key={i} className={`w-[2px] rounded-t-sm ${playingAudioId === msg._id ? 'bg-gold animate-pulse' : 'bg-slate-600'}`} style={{ height: `${Math.max(15, h)}%` }} />)}
                                  </div>
                                  <span className="text-[9px] text-slate-500 font-mono">{msg.voiceNote.duration}s</span>
                                </div>
                              </div>
                            ) : msg.videoMessage ? (
                              <div className="relative w-32 h-32 rounded-full border-2 border-slate-700 overflow-hidden shadow-lg">
                                <video src={msg.videoMessage.videoUrl} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                                <div className="absolute bottom-1 left-0 right-0 text-center bg-black/50 py-0.5"><span className="text-[7px] text-white font-mono">VIDEO</span></div>
                              </div>
                            ) : (
                              <div className={`px-3.5 py-2.5 rounded-2xl text-xs text-left ${
                                isMe ? 'bg-gold text-slate-dark rounded-br-sm font-medium shadow-md' :
                                isMentioned ? 'bg-[#1b223c] text-gold border border-gold/40 rounded-bl-sm shadow-[0_0_12px_rgba(212,175,55,0.2)] font-semibold' :
                                'bg-slate-800 text-slate-200 rounded-bl-sm border border-slate-700/60'
                              }`}>
                                <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.isDeleted ? <span className="italic opacity-60">🗑 Message deleted</span> : renderMessageContent(msg.content)}</p>
                                {msg.attachments?.length > 0 && (
                                  <div className="mt-2 space-y-1.5 border-t border-slate-700/40 pt-2">
                                    {msg.attachments.map((f: any, fi: number) => (
                                      f.fileType === 'image' ? <img key={fi} src={f.fileUrl} alt={f.name} className="max-h-32 w-auto rounded-lg object-cover border border-slate-800" /> :
                                      f.fileType === 'video' ? <video key={fi} src={f.fileUrl} controls className="max-h-32 w-auto rounded-lg border border-slate-800" /> :
                                      <a key={fi} href={f.fileUrl} download className="flex items-center gap-2 bg-slate-900/40 p-2 rounded text-[10px] text-slate-300 hover:text-white">
                                        <Paperclip size={10} className="text-gold flex-shrink-0" /><span className="truncate flex-1">{f.name}</span><Download size={10} className="flex-shrink-0" />
                                      </a>
                                    ))}
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

                  {/* Sticky Input Dock */}
                  <div className="flex-shrink-0 bg-slate-900/80 border-t border-slate-800/60 px-3 py-2.5 relative">
                    {mentionQuery !== null && (
                      <div className="absolute bottom-full left-4 right-4 bg-slate-950/95 border border-slate-800 rounded-2xl max-h-48 overflow-y-auto z-[999] shadow-2xl flex flex-col p-2 gap-1 backdrop-blur-md animate-in slide-in-from-bottom duration-200 mb-2">
                        {mentionSuggestions.length > 0 ? (
                          mentionSuggestions.map((sUser: any) => (
                            <button
                              key={sUser._id}
                              type="button"
                              onClick={() => handleSelectMention(sUser)}
                              className="flex items-center gap-3 w-full px-3 py-1.5 hover:bg-slate-800 rounded-xl text-left transition-colors"
                            >
                              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-gold overflow-hidden">
                                {sUser.photoUrl ? <img src={sUser.photoUrl} alt="" className="w-full h-full object-cover" /> : sUser.firstName.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-slate-200 truncate">{sUser.firstName} {sUser.lastName}</p>
                                <p className="text-[10px] text-slate-500 truncate">{sUser.designation || sUser.role} | {sUser.department}</p>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="text-[10px] text-slate-500 italic p-3 text-center">No matches found</div>
                        )}
                      </div>
                    )}
                    {replyMessage && (
                      <div className="flex items-center justify-between bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/60 mb-2">
                        <div className="text-[10px] text-slate-400 truncate flex-1 mr-2">Replying to <span className="font-bold text-gold">@{replyMessage.sender?.firstName}</span>: {replyMessage.content?.substring(0, 40)}</div>
                        <button onClick={() => setReplyMessage(null)} className="text-slate-500 hover:text-white flex-shrink-0"><X size={12} /></button>
                      </div>
                    )}
                    {(audioRecording || videoRecording) && (
                      <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1.5 mb-2">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-ping flex-shrink-0" />
                        <span className="text-[10px] text-red-400 font-bold">{audioRecording ? `🎤 Recording ${audioTimer}s` : `📹 Recording ${videoTimer}s`}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
                        <button onClick={triggerAudioRecord} className={`p-1.5 rounded-lg text-slate-400 hover:text-gold transition-colors ${audioRecording ? 'bg-red-500/20 text-red-400' : 'hover:bg-slate-800'}`} title="Voice Note"><Mic size={14} /></button>
                        <button onClick={triggerVideoRecord} className={`p-1.5 rounded-lg text-slate-400 hover:text-gold transition-colors ${videoRecording ? 'bg-red-500/20 text-red-400' : 'hover:bg-slate-800'}`} title="Video Message"><Video size={14} /></button>
                      </div>
                      <div className="flex-1 flex items-center bg-slate-950/70 border border-slate-800/80 rounded-xl px-3 gap-1 min-w-0">
                        <input
                          ref={inputRef}
                          type="text"
                          value={typedMessage}
                          onChange={e => setTypedMessage(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendTextMessage(); } }}
                          placeholder={audioRecording ? `Recording... ${audioTimer}s` : videoRecording ? `Recording video... ${videoTimer}s` : 'Type a message...'}
                          disabled={audioRecording || videoRecording}
                          className="flex-1 bg-transparent border-none outline-none text-xs text-slate-300 py-2.5 placeholder-slate-600 min-w-0"
                        />
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <label className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-gold transition-colors cursor-pointer" title="Attach"><Paperclip size={13} /><input type="file" onChange={handleFileUpload} className="hidden" /></label>
                          <button onClick={() => setShowPollModal(true)} className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-gold transition-colors" title="Poll"><BarChart2 size={13} /></button>
                          <button onClick={() => setShowEventModal(true)} className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-gold transition-colors hidden md:block" title="Event"><Calendar size={13} /></button>
                          {['ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER'].includes(user?.role || '') && (
                            <button onClick={() => setShowAppreciationModal(true)} className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-gold transition-colors hidden md:block" title="Award"><Trophy size={13} /></button>
                          )}
                        </div>
                      </div>
                      {/* Send — Always Visible */}
                      <button onClick={handleSendTextMessage} className="bg-gold text-slate-dark w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-lg hover:bg-gold-light gold-glow transition-all flex-shrink-0 active:scale-95" title="Send">
                        <Send size={15} />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center">
                  <MessageSquare size={48} className="text-slate-700 animate-pulse mb-4" />
                  <p className="text-sm font-semibold text-slate-400">Select a channel to start chatting</p>
                  <p className="text-xs text-slate-600 mt-1">Or create a new group to get started</p>
                </div>
              )}
            </div>

            {/* Right Sidebar */}
            {showRightSidebar && store.activeGroup && (() => {
              const activeGroup = store.activeGroup;
              return (
                <>
                  {/* Responsive overlay on mobile/tablet */}
                  <div onClick={() => setShowRightSidebar(false)} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" />
                  
                  <div className="fixed inset-y-0 right-0 z-45 w-80 bg-[#0b1424]/95 border-l border-slate-800/80 p-4 space-y-4 flex flex-col overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-300 lg:static lg:z-0 lg:w-64 xl:w-72 lg:border lg:rounded-xl lg:shadow-none lg:bg-card-dark flex-shrink-0">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-3 flex-shrink-0">
                      <h3 className="text-xs font-bold text-gold uppercase tracking-wider">Group Details</h3>
                      <button onClick={() => setShowRightSidebar(false)} className="text-slate-400 hover:text-white"><X size={15} /></button>
                    </div>

                    {/* Right Sidebar Tab Switcher */}
                    <div className="flex bg-slate-950/80 p-0.5 rounded-lg border border-slate-800/80 text-[10px] uppercase font-bold flex-shrink-0">
                      <button onClick={() => setRightSidebarTab('info')} className={`flex-1 py-1 rounded ${rightSidebarTab === 'info' ? 'bg-gold text-slate-dark' : 'text-slate-400 hover:text-white'}`}>Info</button>
                      <button onClick={() => setRightSidebarTab('members')} className={`flex-1 py-1 rounded ${rightSidebarTab === 'members' ? 'bg-gold text-slate-dark' : 'text-slate-400 hover:text-white'}`}>Members</button>
                      {(() => {
                        const currentUserId = user?.id || (user as any)?._id?.toString();
                        const isCreator = activeGroup.createdBy?._id === currentUserId || activeGroup.createdBy === currentUserId || activeGroup.createdBy?.toString() === currentUserId;
                        const isGroupAdmin = activeGroup.members?.some((m: any) => (m.user?._id?.toString() || m.user?.toString()) === currentUserId && m.role === 'admin');
                        const isRoot = user?.role === 'ROOT_ADMIN';
                        const isAdmin = isCreator || isGroupAdmin || isRoot;
                        if (!isAdmin) return null;
                        return (
                          <>
                            <button onClick={() => setRightSidebarTab('add')} className={`flex-1 py-1 rounded ${rightSidebarTab === 'add' ? 'bg-gold text-slate-dark' : 'text-slate-400 hover:text-white'}`}>+ Add</button>
                            <button onClick={() => setRightSidebarTab('settings')} className={`flex-1 py-1 rounded ${rightSidebarTab === 'settings' ? 'bg-gold text-slate-dark' : 'text-slate-400 hover:text-white'}`}>Settings</button>
                          </>
                        );
                      })()}
                    </div>

                    {/* Tab Contents */}
                    <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-0.5">
                      
                      {/* INFO TAB */}
                      {rightSidebarTab === 'info' && (
                        <div className="space-y-4">
                          <div className="flex flex-col items-center text-center space-y-2.5">
                            <div className="w-16 h-16 rounded-2xl bg-slate-850 border border-slate-800 flex items-center justify-center text-gold font-bold text-2xl overflow-hidden relative shadow-lg gold-glow">
                              {activeGroup.groupIcon ? <img src={activeGroup.groupIcon} alt="" className="w-full h-full object-cover" /> : activeGroup.name.charAt(0)}
                            </div>
                            <div>
                              <h4 className="text-xs font-extrabold text-white uppercase">{activeGroup.name}</h4>
                              <span className="text-[7px] bg-slate-900 border border-slate-800 text-gold px-1.5 py-0.5 rounded font-bold uppercase mt-1 inline-block">{activeGroup.type}</span>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-relaxed italic">"{activeGroup.description || 'No group description set.'}"</p>
                          </div>

                          <div className="border-t border-slate-800/80 pt-3 space-y-2 text-[10px]">
                            <div className="flex justify-between"><span className="text-slate-500 font-bold uppercase">Members Count:</span><span className="text-slate-300 font-bold">{activeGroup.members?.length || 0}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500 font-bold uppercase">Created By:</span><span className="text-slate-300 font-bold">{activeGroup.createdBy?.firstName ? `${activeGroup.createdBy.firstName} ${activeGroup.createdBy.lastName}` : 'System'}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500 font-bold uppercase">Created Date:</span><span className="text-slate-300 font-mono">{(activeGroup as any).createdAt ? new Date((activeGroup as any).createdAt).toLocaleDateString() : 'N/A'}</span></div>
                          </div>

                          <div className="border-t border-slate-800/80 pt-3">
                            <h4 className="text-[9px] text-slate-500 font-bold uppercase mb-2">Shared Files</h4>
                            {(() => {
                              const files = store.messages.flatMap(m => m.attachments || []).filter(Boolean);
                              if (!files.length) return <p className="text-[9px] text-slate-600 italic">No files shared yet.</p>;
                              return files.slice(0, 5).map((f, i) => (
                                <a key={i} href={f.fileUrl} download className="flex items-center gap-2 p-1.5 bg-slate-900/40 border border-slate-800 rounded-lg hover:border-gold/30 mb-1.5 text-[9px] truncate">
                                  <div className="w-5 h-5 rounded bg-slate-800 flex items-center justify-center text-gold flex-shrink-0">{f.fileType === 'image' ? <ImageIcon size={9} /> : <FileText size={9} />}</div>
                                  <span className="flex-1 text-slate-300 truncate">{f.name}</span>
                                </a>
                              ));
                            })()}
                          </div>
                        </div>
                      )}

                      {/* MEMBERS TAB */}
                      {rightSidebarTab === 'members' && (
                        <div className="space-y-3">
                          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Group Members ({activeGroup.members?.length || 0})</p>
                          <div className="space-y-2">
                            {activeGroup.members?.map((m: any, mIdx: number) => {
                              if (!m.user) return null;
                              const mid = m.user._id?.toString() || m.user.id?.toString() || m.user.toString();
                              
                              // Online statuses
                              const statusVal = onlineStatuses[mid] || 'offline';
                              const statusColor = statusVal === 'online' ? 'bg-green-500' : statusVal === 'away' ? 'bg-yellow-500' : 'bg-slate-600';
                              const statusText = statusVal === 'online' ? '🟢 Online' : statusVal === 'away' ? '🟡 Away' : '⚫ Offline';

                              const currentUserId = user?.id || (user as any)?._id?.toString();
                              const isMe = mid === currentUserId;
                              const isTargetCreator = activeGroup.createdBy?._id === mid || activeGroup.createdBy === mid || activeGroup.createdBy?.toString() === mid;
                              
                              const myRoleInGroup = activeGroup.members?.find((member: any) => (member.user?._id?.toString() || member.user?.toString()) === currentUserId)?.role;
                              const isCurrentUserAdmin = myRoleInGroup === 'admin' || user?.role === 'ROOT_ADMIN' || activeGroup.createdBy?._id === currentUserId || activeGroup.createdBy === currentUserId;

                              return (
                                <div key={mid || mIdx} className="bg-slate-900/30 border border-slate-800/60 p-2 rounded-xl flex items-center gap-2 relative group-hover:border-gold/20">
                                  <div className="relative flex-shrink-0">
                                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-gold overflow-hidden">
                                      {m.user.photoUrl ? <img src={m.user.photoUrl} alt="" className="w-full h-full object-cover" /> : m.user.firstName?.charAt(0) || 'U'}
                                    </div>
                                    <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-card-dark ${statusColor}`} title={statusText} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-bold text-slate-200 truncate">{m.user.firstName} {m.user.lastName} {isMe && <span className="text-slate-500 text-[8px] italic">(You)</span>}</p>
                                    <p className="text-[8px] text-slate-500 uppercase truncate">{m.user.department || 'Hotel Guest'} | {m.user.designation || 'Staff'}</p>
                                    <p className="text-[7px] text-slate-600 font-mono mt-0.5 uppercase tracking-wide">{statusVal}</p>
                                  </div>
                                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                    <span className={`text-[7px] px-1 py-0.5 rounded font-mono uppercase font-bold ${m.role === 'admin' ? 'bg-gold/15 text-gold' : 'bg-slate-950 text-slate-600'}`}>{m.role}</span>
                                    
                                    {/* Administrative controls */}
                                    {isCurrentUserAdmin && !isMe && !isTargetCreator && (
                                      <div className="flex items-center gap-1 mt-1 opacity-60 hover:opacity-100 transition-opacity">
                                        <button
                                          onClick={() => handleUpdateMemberRole(mid, m.role === 'admin' ? 'member' : 'admin')}
                                          className="text-[7px] bg-slate-800 text-slate-300 hover:text-gold px-1.5 py-0.5 rounded font-bold uppercase transition-colors"
                                          title={m.role === 'admin' ? 'Demote to Member' : 'Promote to Admin'}
                                        >
                                          Role
                                        </button>
                                        <button
                                          onClick={() => setShowRemoveConfirmId(mid)}
                                          className="text-[7px] bg-red-950/40 text-red-400 hover:bg-red-900/40 hover:text-red-200 px-1.5 py-0.5 rounded font-bold uppercase transition-colors"
                                          title="Remove Member"
                                        >
                                          Kick
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  {/* Remove confirmation inline modal */}
                                  {showRemoveConfirmId === mid && (
                                    <div className="absolute inset-0 bg-[#0d1421] border border-red-500/30 rounded-xl p-2 flex flex-col justify-center items-center text-center z-10 space-y-1.5">
                                      <p className="text-[9px] text-red-400 font-bold">Remove {m.user.firstName} from group?</p>
                                      <div className="flex gap-2">
                                        <button onClick={() => setShowRemoveConfirmId(null)} className="bg-slate-800 text-[8px] font-bold px-2 py-1 rounded text-slate-400 hover:text-white">Cancel</button>
                                        <button onClick={() => handleRemoveMember(mid)} className="bg-red-600 hover:bg-red-500 text-white text-[8px] font-bold px-2 py-1 rounded">Remove</button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* ADD MEMBERS TAB */}
                      {rightSidebarTab === 'add' && (
                        <div className="space-y-3">
                          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Invite Employee</p>
                          <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                            <Search size={10} className="text-slate-500 ml-1 flex-shrink-0" />
                            <input
                              type="text"
                              value={addMemberSearchTerm}
                              onChange={e => setAddMemberSearchTerm(e.target.value)}
                              placeholder="Name, code, manager, department..."
                              className="bg-transparent border-none outline-none text-[10px] w-full text-slate-300 placeholder-slate-600"
                            />
                          </div>
                          <div className="space-y-1.5 max-h-96 overflow-y-auto">
                            {getNonGroupEmployees().slice(0, 15).map((emp: any) => (
                              <div key={emp._id} className="p-2 bg-slate-900/30 border border-slate-800/80 rounded-xl flex items-center justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className="text-[9px] font-bold text-slate-200 truncate">{emp.firstName} {emp.lastName}</p>
                                  <p className="text-[8px] text-slate-500 truncate">{emp.department || 'General'} | {emp.designation || 'Staff'}</p>
                                  {emp.employeeId && <p className="text-[7px] text-slate-600 font-mono mt-0.5">Code: {emp.employeeId}</p>}
                                </div>
                                <button
                                  onClick={() => handleAddMember(emp._id)}
                                  className="bg-gold hover:bg-gold-light text-slate-dark text-[9px] font-bold px-2 py-1 rounded-lg flex-shrink-0 active:scale-95 transition-all"
                                >
                                  Add
                                </button>
                              </div>
                            ))}
                            {getNonGroupEmployees().length === 0 && (
                              <p className="text-center text-slate-600 text-[9px] py-4 italic">No matching employees found</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* SETTINGS TAB */}
                      {rightSidebarTab === 'settings' && (
                        <div className="space-y-4">
                          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Group Settings</p>
                          
                          {/* Drag & Drop Icon upload zone */}
                          <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDropIcon(e, 'edit')}
                            className={`border-2 border-dashed rounded-2xl p-4 text-center transition-all cursor-pointer relative ${
                              isDraggingIcon ? 'border-gold bg-gold/5 scale-95 shadow-md shadow-gold/10' : 'border-slate-800 hover:border-gold/30 bg-slate-950/20'
                            }`}
                          >
                            <input
                              type="file"
                              id="edit-icon-uploader"
                              accept="image/jpeg,image/png,image/webp,image/svg+xml"
                              onChange={(e) => handleIconFileSelect(e, 'edit')}
                              className="hidden"
                            />
                            <label htmlFor="edit-icon-uploader" className="cursor-pointer space-y-1.5 block">
                              {editGroupIcon ? (
                                <img src={editGroupIcon} alt="" className="w-12 h-12 rounded-xl mx-auto object-cover border border-slate-850 shadow" />
                              ) : (
                                <div className="w-12 h-12 rounded-xl bg-slate-855 flex items-center justify-center text-slate-600 mx-auto"><ImageIcon size={18} /></div>
                              )}
                              <div>
                                <p className="text-[9px] text-slate-300 font-bold">Drag & drop icon image</p>
                                <p className="text-[8px] text-slate-500 mt-0.5">JPG, PNG, WEBP up to 5MB</p>
                              </div>
                            </label>
                          </div>

                          <div className="space-y-3 text-xs">
                            <div>
                              <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Group Name</label>
                              <input
                                type="text"
                                value={editGroupName}
                                onChange={e => setEditGroupName(e.target.value)}
                                placeholder="Group Name"
                                className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 focus:border-gold outline-none text-[10px]"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Description</label>
                              <textarea
                                value={editGroupDesc}
                                onChange={e => setEditGroupDesc(e.target.value)}
                                placeholder="Group Description"
                                className="w-full h-20 bg-slate-950/60 border border-slate-800 rounded-lg p-3 text-slate-300 focus:border-gold outline-none resize-none text-[10px]"
                              />
                            </div>
                            <button
                              onClick={handleUpdateGroupSettings}
                              disabled={isUpdatingGroup || !editGroupName.trim()}
                              className="w-full bg-gold hover:bg-gold-light disabled:bg-slate-800 disabled:text-slate-600 text-slate-dark text-[10px] font-bold py-2 rounded-lg transition-all active:scale-95 flex items-center justify-center gap-1.5"
                            >
                              {isUpdatingGroup ? 'Saving...' : 'Save Settings'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
          </>
        )}

        {/* SOCIAL WALL TAB */}
        {activeTab === 'social' && (
          <div className="flex-1 flex flex-col md:flex-row gap-4 overflow-y-auto md:overflow-hidden min-h-0">
            <div className="w-full md:w-96 bg-card-dark border border-slate-800 rounded-xl p-5 self-start space-y-4 flex-shrink-0">
              <h3 className="text-xs font-bold text-gold uppercase tracking-wider">Share an Achievement</h3>
              <div className="space-y-3">
                <textarea value={socialContent} onChange={e => setSocialContent(e.target.value)} placeholder="What achievement did you hit today?" className="w-full h-24 bg-slate-950/60 border border-slate-800 rounded-lg p-3 text-xs text-slate-300 focus:border-gold outline-none resize-none" />
                <div className="space-y-2">
                  <label className="block text-[10px] text-slate-500 font-bold uppercase">Media URL</label>
                  <input type="text" value={socialMediaUrl} onChange={e => setSocialMediaUrl(e.target.value)} placeholder="https://pic.url" className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-gold outline-none" />
                  {socialMediaUrl && <select value={socialMediaType} onChange={(e: any) => setSocialMediaType(e.target.value)} className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-gold outline-none"><option value="none">Type...</option><option value="image">Image</option><option value="video">Video</option></select>}
                </div>
                <input type="text" value={socialAchievementTitle} onChange={e => setSocialAchievementTitle(e.target.value)} placeholder="Award badge title..." className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-gold outline-none" />
                <button onClick={handleSocialSubmit} className="w-full bg-gold hover:bg-gold-light text-slate-dark text-xs font-bold py-2.5 rounded-lg gold-glow transition-all">Publish to Wall</button>
              </div>
            </div>
            <div className="flex-1 md:overflow-y-auto space-y-4 pr-1 pb-4">
              {store.socialPosts.length > 0 ? store.socialPosts.map(post => (
                <div key={post._id} className="bg-card-dark border border-slate-800 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-full bg-slate-800 border border-gold/30 flex items-center justify-center font-bold text-gold overflow-hidden">
                      {post.author?.photoUrl ? <img src={post.author.photoUrl} alt="" className="w-full h-full rounded-full object-cover" /> : post.author?.firstName?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2"><h4 className="text-xs font-bold text-white">{post.author?.firstName} {post.author?.lastName}</h4><span className="text-[8px] bg-slate-800 text-gold px-1 py-0.5 rounded font-bold uppercase">{post.author?.role}</span></div>
                      <p className="text-[9px] text-slate-500">{post.author?.department || 'OXY Partner'}</p>
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-300 whitespace-pre-line mb-3">{post.content}</p>
                  {post.achievement?.title && <div className="flex items-center gap-2 bg-gold/10 border border-gold/30 p-2 rounded-lg text-gold w-fit mb-3"><Trophy size={12} /><span className="text-[9px] font-bold uppercase">Badge: {post.achievement.title}</span></div>}
                  {post.mediaUrls?.length > 0 && <div className="rounded-lg overflow-hidden border border-slate-800 mb-3">{post.mediaType === 'image' ? <img src={post.mediaUrls[0]} alt="" className="max-h-64 w-full object-cover" /> : <video src={post.mediaUrls[0]} controls className="max-h-64 w-full" />}</div>}
                  <div className="flex items-center gap-4 pt-3 border-t border-slate-800/60">
                    {(['like', 'celebrate', 'insightful'] as const).map(type => {
                      const icons: any = { like: <Trophy size={11} />, celebrate: <Sparkles size={11} className="text-gold" />, insightful: <Lightbulb size={11} /> };
                      const count = post.reactions.filter(r => r.type === type).length;
                      const active = post.reactions.some(r => r.user.toString() === user?.id && r.type === type);
                      return <button key={type} onClick={() => store.reactSocialPost(post._id, type)} className={`flex items-center gap-1 text-xs ${active ? 'text-gold font-bold' : 'text-slate-400 hover:text-white'}`}>{icons[type]} {type.charAt(0).toUpperCase() + type.slice(1)} ({count})</button>;
                    })}
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-800/60 space-y-2">
                    {post.comments?.map((c, ci) => (
                      <div key={c._id || ci} className="flex gap-2 text-xs bg-slate-900/40 p-2 rounded-lg border border-slate-800/30">
                        <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center font-bold text-gold text-[9px] flex-shrink-0">{c.user?.firstName?.charAt(0) || 'U'}</div>
                        <div><span className="font-bold text-slate-300">{c.user?.firstName} {c.user?.lastName}</span><p className="text-slate-400 mt-0.5">{c.content}</p></div>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 mt-1">
                      <input type="text" placeholder="Write a comment..." value={commentInput[post._id] || ''} onChange={e => setCommentInput({ ...commentInput, [post._id]: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') handleSocialCommentSubmit(post._id); }} className="flex-1 bg-slate-950/60 text-xs px-3 py-2 rounded-lg border border-slate-800 focus:border-gold outline-none" />
                      <button onClick={() => handleSocialCommentSubmit(post._id)} className="bg-gold text-slate-dark text-xs font-bold px-3 py-2 rounded-lg hover:bg-gold-light">Post</button>
                    </div>
                  </div>
                </div>
              )) : <div className="text-slate-500 py-12 text-center text-xs">No social posts yet.</div>}
            </div>
          </div>
        )}

        {/* KNOWLEDGE TAB */}
        {activeTab === 'knowledge' && (
          <div className="flex-1 flex flex-col gap-4 overflow-hidden min-h-0 relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
              <div className="flex flex-wrap items-center gap-2">
                {['SOP', 'Training', 'Tip', 'Document'].map(cat => (
                  <button key={cat} onClick={() => { setSopCategory(cat as any); store.fetchKnowledgeItems({ category: cat }); }} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border ${sopCategory === cat ? 'bg-gold border-gold text-slate-dark' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'}`}>{cat}</button>
                ))}
              </div>
              {['ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER'].includes(user?.role || '') && (
                <button onClick={() => setShowSopModal(true)} className="flex items-center gap-2 bg-gold hover:bg-gold-light text-slate-dark text-xs font-bold px-4 py-2 rounded-xl gold-glow"><Plus size={12} /> Publish SOP</button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
              {store.knowledgeItems.map(item => (
                <div key={item._id} onClick={() => setSelectedSopItem(item)} className="bg-card-dark border border-slate-800 hover:border-gold/30 rounded-xl p-5 cursor-pointer hover:shadow-lg transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[9px] bg-gold/10 text-gold border border-gold/30 px-2 py-0.5 rounded font-extrabold uppercase">{item.category}</span>
                      {item.department && <span className="text-[9px] bg-slate-950 text-slate-400 px-2 py-0.5 rounded">{item.department}</span>}
                    </div>
                    <h3 className="text-xs font-bold text-white mb-2 line-clamp-1">{item.title}</h3>
                    <p className="text-[10px] text-slate-400 line-clamp-3 leading-relaxed">{item.content}</p>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-800/60 pt-3 mt-3 text-[10px] text-slate-500 font-semibold uppercase">
                    <span>By: {item.author?.firstName} {item.author?.lastName}</span>
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
            {selectedSopItem && (
              <div className="absolute inset-0 bg-slate-dark/95 border border-slate-850 rounded-xl p-6 overflow-y-auto z-20">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] bg-gold/25 border border-gold/40 text-gold px-2.5 py-0.5 rounded font-bold uppercase">{selectedSopItem.category}</span>
                    <h2 className="text-xs font-bold text-white uppercase">{selectedSopItem.title}</h2>
                  </div>
                  <button onClick={() => setSelectedSopItem(null)} className="text-slate-400 hover:text-white text-xs bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">Close</button>
                </div>
                <div className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap">{selectedSopItem.content}</div>
                {selectedSopItem.attachments?.length > 0 && (
                  <div className="mt-6 border-t border-slate-800/80 pt-4">
                    <h4 className="text-[10px] text-slate-400 uppercase font-bold mb-2">Attachments</h4>
                    {selectedSopItem.attachments.map((att: any, i: number) => (
                      <a key={i} href={att.fileUrl} download className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-3 rounded-lg text-xs hover:text-gold w-fit mb-2"><Paperclip size={12} className="text-gold" /><span>{att.name}</span></a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === 'analytics' && (
          <div className="flex-grow flex flex-col gap-5 overflow-y-auto pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[{ label: 'Total Messages', value: '1,482', icon: <MessageSquare className="text-gold opacity-30" size={28} /> }, { label: 'Active Employees', value: '34', icon: <Users className="text-gold opacity-30" size={28} /> }, { label: 'Audit Logs', value: '89', icon: <CheckSquare className="text-gold opacity-30" size={28} /> }].map(s => (
                <div key={s.label} className="bg-card-dark border border-slate-800 rounded-xl p-5 flex items-center justify-between">
                  <div><p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{s.label}</p><h3 className="text-xl font-bold text-gold mt-1 font-mono">{s.value}</h3></div>
                  {s.icon}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-card-dark border border-slate-800 rounded-xl p-5">
                <h3 className="text-xs font-bold text-white mb-4 uppercase tracking-wider">Most Active Departments</h3>
                <div className="space-y-3">
                  {[{ dept: 'Front Office', count: 420, pct: 80 }, { dept: 'Housekeeping', count: 310, pct: 62 }, { dept: 'Kitchen', count: 210, pct: 42 }, { dept: 'Human Resources', count: 180, pct: 36 }].map((it, i) => (
                    <div key={i}><div className="flex justify-between text-xs text-slate-300 mb-1"><span>{it.dept}</span><span>{it.count}</span></div><div className="w-full bg-slate-900 rounded-full h-1.5"><div className="bg-gold h-1.5 rounded-full" style={{ width: `${it.pct}%` }} /></div></div>
                  ))}
                </div>
              </div>
              <div className="bg-card-dark border border-slate-800 rounded-xl p-5">
                <h3 className="text-xs font-bold text-white mb-4 uppercase tracking-wider">Top Contributors</h3>
                <div className="space-y-2">
                  {[{ name: 'Elena Rostova', xp: '180 Posts' }, { name: 'Marcus Aurelius', xp: '142 Posts' }, { name: 'Sarah Jenkins', xp: '110 Posts' }, { name: 'David Miller', xp: '82 Posts' }].map((e, i) => (
                    <div key={i} className="flex justify-between items-center text-xs bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/30">
                      <div className="flex items-center gap-2"><div className="w-5 h-5 rounded bg-gold/10 text-gold flex items-center justify-center font-bold text-[9px]">{i + 1}</div><span className="font-bold text-slate-200">{e.name}</span></div>
                      <span className="text-[9px] text-slate-400 font-mono">{e.xp}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODALS */}

      {/* Create Group */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card-dark border border-slate-800/80 rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200 text-slate-200 my-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-gold uppercase tracking-wider">Create Group Chat</h3>
              <button onClick={() => setShowCreateGroup(false)} className="text-slate-400 hover:text-white"><X size={16} /></button>
            </div>
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Group Name</label><input type="text" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="e.g. Housekeeping Team" className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 focus:border-gold outline-none" /></div>
                <div><label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Group Type</label>
                  <select value={newGroupType} onChange={e => setNewGroupType(e.target.value)} className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 focus:border-gold outline-none">
                    <option value="DepartmentGroup">Department Group</option>
                    <option value="TeamGroup">Team Group</option>
                    <option value="CustomGroup">Custom Group</option>
                    <option value="PublicGroup">Public Group</option>
                    <option value="PrivateGroup">Private Group</option>
                    <option value="AnnouncementChannel">Announcement Channel</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Description</label><input type="text" value={newGroupDesc} onChange={e => setNewGroupDesc(e.target.value)} placeholder="Daily shift notes" className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 focus:border-gold outline-none" /></div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Group Icon</label>
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDropIcon(e, 'create')}
                    className={`border-2 border-dashed rounded-xl p-3 text-center transition-all cursor-pointer relative ${
                      isDraggingIcon ? 'border-gold bg-gold/5 scale-95' : 'border-slate-800 hover:border-gold/30 bg-slate-950/20'
                    }`}
                  >
                    <input
                      type="file"
                      id="create-icon-uploader"
                      accept="image/jpeg,image/png,image/webp,image/svg+xml"
                      onChange={(e) => handleIconFileSelect(e, 'create')}
                      className="hidden"
                    />
                    <label htmlFor="create-icon-uploader" className="cursor-pointer space-y-1 block">
                      {groupIcon ? (
                        <div className="relative w-10 h-10 mx-auto">
                          <img src={groupIcon} alt="" className="w-10 h-10 rounded-lg object-cover border border-slate-850 shadow" />
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setGroupIcon(''); }}
                            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center text-[8px]"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-850 flex items-center justify-center text-slate-500 mx-auto"><ImageIcon size={14} /></div>
                      )}
                      <div>
                        <p className="text-[8px] text-slate-300 font-bold">Drag or click to upload Icon</p>
                        <p className="text-[6px] text-slate-500">JPG, PNG, WEBP, SVG max 5MB</p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-800/80 pt-3">
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-2">Member Selection</label>
                <div className="flex bg-slate-950/80 p-1 rounded-xl border border-slate-800/60">
                  {(['department', 'manager', 'employee'] as const).map(mode => (
                    <button key={mode} type="button" onClick={() => setGroupSelectionMode(mode)} className={`flex-1 py-1.5 rounded-lg font-bold text-[10px] uppercase transition-all ${groupSelectionMode === mode ? 'bg-gold text-slate-dark' : 'text-slate-400 hover:text-slate-200'}`}>{mode}</button>
                  ))}
                </div>
              </div>
              <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-3 min-h-[120px] max-h-[200px] overflow-y-auto">
                {groupSelectionMode === 'department' && (
                  <div>
                    <p className="text-[9px] text-slate-500 mb-2">Select departments:</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {departmentsList.map(dept => { const checked = selectedDepts.includes(dept); return <label key={dept} className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white text-[10px]"><input type="checkbox" checked={checked} onChange={() => setSelectedDepts(checked ? selectedDepts.filter(d => d !== dept) : [...selectedDepts, dept])} className="accent-gold" /><span className="truncate">{dept}</span></label>; })}
                    </div>
                    {newGroupType === 'DepartmentGroup' && <div className="border-t border-slate-800/60 pt-2 mt-2 flex items-center gap-2"><input type="checkbox" id="asd2" checked={autoSyncDept} onChange={e => setAutoSyncDept(e.target.checked)} className="accent-gold" /><label htmlFor="asd2" className="text-[9px] text-slate-400 cursor-pointer">Auto-sync future employees</label></div>}
                  </div>
                )}
                {groupSelectionMode === 'manager' && (
                  <div>
                    <p className="text-[9px] text-slate-500 mb-2">Select managers:</p>
                    <div className="grid grid-cols-2 gap-1.5">{Array.from(new Set(recipientList.map(e => e.reportingManager).filter(Boolean))).map((mgr: any, i) => <label key={mgr || i} className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white text-[10px]"><input type="checkbox" checked={selectedManagers.includes(mgr)} onChange={() => setSelectedManagers(selectedManagers.includes(mgr) ? selectedManagers.filter(m => m !== mgr) : [...selectedManagers, mgr])} className="accent-gold" /><span className="truncate">{mgr}</span></label>)}</div>
                  </div>
                )}
                {groupSelectionMode === 'employee' && (
                  <div>
                    <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-lg border border-slate-800 mb-2"><Search size={10} className="text-slate-500 ml-1" /><input type="text" value={employeeSearchTerm} onChange={e => setEmployeeSearchTerm(e.target.value)} placeholder="Search employees..." className="bg-transparent border-none outline-none text-[10px] w-full text-slate-300" /></div>
                    <div className="space-y-1">
                      {recipientList.filter(emp => `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(employeeSearchTerm.toLowerCase())).map((emp, i) => { const checked = selectedEmployees.includes(emp._id); return <label key={emp._id || i} className="flex items-center gap-2 p-1.5 bg-slate-900/30 rounded border border-slate-800 hover:bg-slate-900/60 cursor-pointer text-[10px]"><input type="checkbox" checked={checked} onChange={() => setSelectedEmployees(checked ? selectedEmployees.filter(id => id !== emp._id) : [...selectedEmployees, emp._id])} className="accent-gold" /><span className="font-semibold text-slate-300 truncate">{emp.firstName} {emp.lastName}</span><span className="text-[8px] bg-slate-950 px-1 rounded text-slate-500 uppercase flex-shrink-0">{emp.department}</span></label>; })}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCreateGroup(false)} className="bg-slate-800 text-xs font-bold px-4 py-2 rounded-lg text-slate-300">Cancel</button>
              <button onClick={handleGroupCreateSubmit} className="bg-gold text-slate-dark text-xs font-bold px-4 py-2 rounded-lg hover:bg-gold-light">Create Group</button>
            </div>
          </div>
        </div>
      )}

      {/* Poll Modal */}
      {showPollModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card-dark border border-slate-800/80 rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center"><h3 className="text-xs font-bold text-gold uppercase">Create a Poll</h3><button onClick={() => setShowPollModal(false)} className="text-slate-400 hover:text-white"><X size={14} /></button></div>
            <div className="space-y-3">
              <div><label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Question</label><input type="text" value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} placeholder="Who will attend the SOP training?" className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-gold outline-none" /></div>
              <div className="space-y-2">
                <label className="block text-[10px] text-slate-500 font-bold uppercase">Options</label>
                {pollOptions.map((opt, i) => <input key={i} type="text" value={opt} onChange={e => { const u = [...pollOptions]; u[i] = e.target.value; setPollOptions(u); }} placeholder={`Option ${i + 1}`} className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-gold outline-none" />)}
                {pollOptions.length < 5 && <button onClick={() => setPollOptions([...pollOptions, ''])} className="text-[10px] text-gold font-bold">+ Add Option</button>}
              </div>
            </div>
            <div className="flex gap-2 justify-end"><button onClick={() => setShowPollModal(false)} className="bg-slate-800 text-xs font-bold px-4 py-2 rounded-lg text-slate-300">Cancel</button><button onClick={handlePollSubmit} className="bg-gold text-slate-dark text-xs font-bold px-4 py-2 rounded-lg">Launch Poll</button></div>
          </div>
        </div>
      )}

      {/* Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card-dark border border-slate-800/80 rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center"><h3 className="text-xs font-bold text-gold uppercase">Schedule Event</h3><button onClick={() => setShowEventModal(false)} className="text-slate-400 hover:text-white"><X size={14} /></button></div>
            <div className="space-y-3">
              <div><label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Title</label><input type="text" value={eventTitle} onChange={e => setEventTitle(e.target.value)} placeholder="Sanitation SOP Training" className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-gold outline-none" /></div>
              <div><label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Type</label><select value={eventType} onChange={(e: any) => setEventType(e.target.value)} className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-gold outline-none"><option value="Meeting">Operational Meeting</option><option value="Webinar">Webinar</option><option value="Training">Training Session</option></select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Date</label><input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-gold outline-none" /></div>
                <div><label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Time</label><input type="text" value={eventTime} onChange={e => setEventTime(e.target.value)} placeholder="11:30 AM" className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-gold outline-none" /></div>
              </div>
            </div>
            <div className="flex gap-2 justify-end"><button onClick={() => setShowEventModal(false)} className="bg-slate-800 text-xs font-bold px-4 py-2 rounded-lg text-slate-300">Cancel</button><button onClick={handleEventSubmit} className="bg-gold text-slate-dark text-xs font-bold px-4 py-2 rounded-lg">Save Event</button></div>
          </div>
        </div>
      )}

      {/* Appreciation Modal */}
      {showAppreciationModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card-dark border border-slate-800/80 rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center"><h3 className="text-xs font-bold text-gold uppercase">Award Appreciation</h3><button onClick={() => setShowAppreciationModal(false)} className="text-slate-400 hover:text-white"><X size={14} /></button></div>
            <div className="space-y-3">
              <div><label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Recipient</label>
                <select value={awardRecipient} onChange={e => setAwardRecipient(e.target.value)} className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-gold outline-none">
                  <option value="">Select Employee...</option>
                  {recipientList.map((emp, i) => <option key={emp._id || i} value={emp._id}>{emp.firstName} {emp.lastName} ({emp.department})</option>)}
                </select>
              </div>
              <div><label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Award Category</label>
                <select value={awardType} onChange={(e: any) => setAwardType(e.target.value)} className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-gold outline-none">
                  <option value="EmployeeOfMonth">Employee of the Month</option>
                  <option value="StarPerformer">Star Performer</option>
                  <option value="ElitePerformer">Elite Performer</option>
                  <option value="TopSales">Top Sales</option>
                  <option value="BestHousekeeping">Best Housekeeping</option>
                </select>
              </div>
              <div><label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Details</label><textarea value={awardDetails} onChange={e => setAwardDetails(e.target.value)} placeholder="Achievement details..." className="w-full h-20 bg-slate-950/60 border border-slate-800 rounded-lg p-3 text-xs text-slate-300 focus:border-gold outline-none resize-none" /></div>
            </div>
            <div className="flex gap-2 justify-end"><button onClick={() => setShowAppreciationModal(false)} className="bg-slate-800 text-xs font-bold px-4 py-2 rounded-lg text-slate-300">Cancel</button><button onClick={handleAppreciationSubmit} className="bg-gold text-slate-dark text-xs font-bold px-4 py-2 rounded-lg">Issue Award</button></div>
          </div>
        </div>
      )}

      {/* SOP Modal */}
      {showSopModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card-dark border border-slate-800/80 rounded-2xl w-full max-w-md p-6 space-y-4 my-4">
            <div className="flex justify-between items-center"><h3 className="text-xs font-bold text-gold uppercase">Publish SOP</h3><button onClick={() => setShowSopModal(false)} className="text-slate-400 hover:text-white"><X size={14} /></button></div>
            <div className="space-y-3">
              <div><label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Title</label><input type="text" value={sopTitle} onChange={e => setSopTitle(e.target.value)} placeholder="e.g. VIP Check-in Protocols" className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-gold outline-none" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Category</label><select value={sopCategory} onChange={(e: any) => setSopCategory(e.target.value)} className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-gold outline-none"><option value="SOP">SOP Manual</option><option value="Training">Training</option><option value="Tip">Tip</option><option value="Document">Document</option></select></div>
                <div><label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Department</label><select value={sopDept} onChange={e => setSopDept(e.target.value)} className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-gold outline-none"><option value="">All Departments</option>{departmentsList.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
              </div>
              <div><label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Tags (comma separated)</label><input type="text" value={sopTags} onChange={e => setSopTags(e.target.value)} placeholder="frontdesk, guest, safety" className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-gold outline-none" /></div>
              <div><label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Content</label><textarea value={sopContent} onChange={e => setSopContent(e.target.value)} placeholder="Write SOP steps here..." className="w-full h-24 bg-slate-950/60 border border-slate-800 rounded-lg p-3 text-xs text-slate-300 focus:border-gold outline-none resize-none" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Attachment URL</label><input type="text" value={sopAttachmentUrl} onChange={e => setSopAttachmentUrl(e.target.value)} placeholder="https://docs.com/sop.pdf" className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-gold outline-none" /></div>
                <div><label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Attachment Name</label><input type="text" value={sopAttachmentName} onChange={e => setSopAttachmentName(e.target.value)} placeholder="Download PDF" className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-gold outline-none" /></div>
              </div>
            </div>
            <div className="flex gap-2 justify-end"><button onClick={() => setShowSopModal(false)} className="bg-slate-800 text-xs font-bold px-4 py-2 rounded-lg text-slate-300">Cancel</button><button onClick={handleSopSubmit} className="bg-gold text-slate-dark text-xs font-bold px-4 py-2 rounded-lg">Publish</button></div>
          </div>
        </div>
      )}

      {/* Active Call Overlay */}
      {store.activeCall && (
        <div className="fixed bottom-4 right-4 bg-[#09112a] border-2 border-gold rounded-2xl p-4 shadow-2xl z-50 w-64 space-y-3 gold-glow text-slate-100 animate-in slide-in-from-bottom duration-300">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <span className="text-[9px] uppercase font-bold text-gold tracking-widest flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />Live {store.activeCall.callType} Call</span>
            <button onClick={() => store.leaveCall(store.activeCall._id)} className="text-slate-500 hover:text-white text-xs bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">✕ Leave</button>
          </div>
          <div className="flex items-center gap-2 bg-slate-900/60 p-2 rounded-xl border border-slate-800/80">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-gold/30 flex items-center justify-center font-bold text-gold overflow-hidden flex-shrink-0">
              {store.activeCall.caller?.photoUrl ? <img src={store.activeCall.caller.photoUrl} alt="" className="w-full h-full object-cover" /> : store.activeCall.caller?.firstName?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0"><p className="text-[9px] text-slate-500">Host</p><p className="text-xs font-bold text-slate-200 truncate">{store.activeCall.caller?.firstName} {store.activeCall.caller?.lastName}</p></div>
          </div>
          <div className="flex flex-wrap gap-2">
            {store.activeCall.participants?.map((p: any) => (
              <div key={p._id} className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300 overflow-hidden relative">
                  {p.photoUrl ? <img src={p.photoUrl} alt="" className="w-full h-full object-cover" /> : p.firstName?.charAt(0) || 'U'}
                  <span className="absolute inset-0 rounded-full border border-gold/40 animate-pulse" />
                </div>
                <span className="text-[7px] text-slate-400 mt-0.5">{p.firstName}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2 border-t border-slate-800/80 pt-2">
            <button onClick={() => setMicMuted(!micMuted)} className={`flex-1 py-1.5 rounded-xl text-[9px] font-bold uppercase border flex items-center justify-center gap-1 ${micMuted ? 'bg-red-500/15 border-red-500/30 text-red-400' : 'bg-slate-900 border-slate-800 text-slate-400'}`}><Mic size={10} /> {micMuted ? 'Muted' : 'Mute'}</button>
            {store.activeCall.callType === 'video' && <button onClick={() => setCameraOff(!cameraOff)} className={`flex-1 py-1.5 rounded-xl text-[9px] font-bold uppercase border flex items-center justify-center gap-1 ${cameraOff ? 'bg-red-500/15 border-red-500/30 text-red-400' : 'bg-slate-900 border-slate-800 text-slate-400'}`}><VideoOff size={10} /> {cameraOff ? 'Off' : 'Video'}</button>}
            <button onClick={() => store.leaveCall(store.activeCall._id)} className="p-1.5 bg-red-600 hover:bg-red-500 border border-red-600 rounded-xl text-white flex items-center justify-center"><PhoneOff size={12} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
