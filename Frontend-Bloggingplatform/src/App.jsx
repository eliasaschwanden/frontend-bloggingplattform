import React, { useState, useEffect } from 'react';
import { User, MessageCircle, Heart, Share, Plus, LogOut, Home, Search, Bell, Mail, Bookmark, Users, Settings, Menu, X } from 'lucide-react';
import "./App.css"

const API_BASE_URL = 'http://localhost:8080';

const BloggingPlatform = () => {
    const [currentUser, setCurrentUser] = useState(null);
    const [blogs, setBlogs] = useState([]);
    const [users, setUsers] = useState([]);
    const [loginUsername, setLoginUsername] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [newBlogTitle, setNewBlogTitle] = useState('');
    const [newBlogContent, setNewBlogContent] = useState('');
    const [showNewBlogForm, setShowNewBlogForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('home');
    const [isMobile, setIsMobile] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [commentInputs, setCommentInputs] = useState({});
    const [showComments, setShowComments] = useState({});
    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState('');
    const [selectedChat, setSelectedChat] = useState(null);
    const [unreadMessages, setUnreadMessages] = useState([]);
    const [showMessageView, setShowMessageView] = useState(false);
    const [likedPosts, setLikedPosts] = useState(new Set());

    // Check if mobile
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Fetch all users and blogs on component mount
    useEffect(() => {
        fetchUsers();
        fetchBlogs();
    }, []);

    // Fetch unread messages when user logs in
    useEffect(() => {
        if (currentUser) {
            fetchUnreadMessages();

            // Set up polling for new messages (every 30 seconds)
            const interval = setInterval(() => {
                fetchUnreadMessages();
                if (selectedChat) {
                    fetchConversation(selectedChat.id);
                }
            }, 30000);

            return () => clearInterval(interval);
        }
    }, [currentUser, selectedChat]);

    const fetchUsers = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/users`);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const usersData = await response.json();
            setUsers(usersData);
        } catch (error) {
            console.error('Error fetching users:', error);
            alert('Fehler beim Laden der Benutzer: ' + error.message);
        }
    };

    const fetchBlogs = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/blogs`);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const blogsData = await response.json();

            // Fetch comments and likes for each blog
            const blogsWithDetails = await Promise.all(
                blogsData.map(async (blog) => {
                    // Get comments
                    let comments = [];
                    try {
                        const commentsResponse = await fetch(`${API_BASE_URL}/blogs/${blog.id}/comments`);
                        if (commentsResponse.ok) {
                            comments = await commentsResponse.json();
                        }
                    } catch (e) {
                        console.error(`Error fetching comments for blog ${blog.id}:`, e);
                    }

                    // Get likes
                    let likes = [];
                    try {
                        const likesResponse = await fetch(`${API_BASE_URL}/blogs/${blog.id}/likes`);
                        if (likesResponse.ok) {
                            likes = await likesResponse.json();

                            // Update liked posts set
                            if (currentUser && likes.some(like => like.user?.id === currentUser.id)) {
                                setLikedPosts(prev => new Set([...prev, blog.id]));
                            }
                        }
                    } catch (e) {
                        console.error(`Error fetching likes for blog ${blog.id}:`, e);
                    }

                    return {
                        ...blog,
                        comments,
                        likes
                    };
                })
            );

            setBlogs(blogsWithDetails.reverse()); // Show newest first
        } catch (error) {
            console.error('Error fetching blogs:', error);
            alert('Fehler beim Laden der Blogs: ' + error.message);
        }
    };

    const fetchUnreadMessages = async () => {
        if (!currentUser) return;

        try {
            const response = await fetch(`${API_BASE_URL}/messages/unread/${currentUser.id}`);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const unreadData = await response.json();
            setUnreadMessages(unreadData);
        } catch (error) {
            console.error('Error fetching unread messages:', error);
        }
    };

    const fetchConversation = async (otherUserId) => {
        if (!currentUser) return;

        try {
            const response = await fetch(`${API_BASE_URL}/messages/${currentUser.id}/${otherUserId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const conversation = await response.json();
            setMessages(conversation);

            // Mark messages as read
            conversation.forEach(message => {
                if (message.receiver.id === currentUser.id && !message.read) {
                    markMessageAsRead(message.id);
                }
            });
        } catch (error) {
            console.error('Error fetching conversation:', error);
        }
    };

    const markMessageAsRead = async (messageId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/messages/${messageId}/read`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            fetchUnreadMessages(); // Update unread count
        } catch (error) {
            console.error('Error marking message as read:', error);
        }
    };

    const handleLogin = async () => {
        setLoading(true);

        try {
            const user = users.find(u => u.username.toLowerCase() === loginUsername.toLowerCase());
            if (user) {
                setCurrentUser(user);
                setLoginUsername('');
                setLoginPassword('');
            } else {
                alert('Benutzer nicht gefunden. Verfügbare Benutzer: ' + users.map(u => u.username).join(', '));
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('Login fehlgeschlagen');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateBlog = async () => {
        if (!newBlogTitle.trim() || !newBlogContent.trim()) return;

        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/blogs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: newBlogTitle,
                    content: newBlogContent,
                    blogUser: currentUser
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            setNewBlogTitle('');
            setNewBlogContent('');
            setShowNewBlogForm(false);
            fetchBlogs();
        } catch (error) {
            console.error('Error creating blog:', error);
            alert('Fehler beim Erstellen des Blogs: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLike = async (blogId) => {
        if (!currentUser) return;

        try {
            console.log(`Sending like request for blog ${blogId} by user ${currentUser.id}`);
            const response = await fetch(`${API_BASE_URL}/blogs/${blogId}/likes?userId=${currentUser.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                const errorData = await response.text();
                console.error('Server response:', errorData);
                throw new Error(`HTTP error! Status: ${response.status}, Details: ${errorData}`);
            }

            // Update UI immediately
            setLikedPosts(prev => {
                const newSet = new Set(prev);
                if (newSet.has(blogId)) {
                    newSet.delete(blogId);
                } else {
                    newSet.add(blogId);
                }
                return newSet;
            });

            // Then fetch updated data
            fetchBlogs();
        } catch (error) {
            console.error('Error liking blog:', error);
            alert('Fehler beim Liken: ' + error.message);
        }
    };

    const handleComment = async (blogId) => {
        if (!currentUser) return;
        const commentText = commentInputs[blogId];
        if (!commentText?.trim()) return;

        try {
            const response = await fetch(`${API_BASE_URL}/blogs/${blogId}/comments?userId=${currentUser.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content: commentText
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            setCommentInputs(prev => ({ ...prev, [blogId]: '' }));
            fetchBlogs(); // Refresh to get updated comments
        } catch (error) {
            console.error('Error commenting:', error);
            alert('Fehler beim Kommentieren: ' + error.message);
        }
    };

    const handleSendMessage = async () => {
        if (!currentUser || !selectedChat || !messageInput.trim()) return;

        try {
            const response = await fetch(`${API_BASE_URL}/messages?senderId=${currentUser.id}&receiverId=${selectedChat.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content: messageInput
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            setMessageInput('');
            fetchConversation(selectedChat.id);
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Fehler beim Senden der Nachricht: ' + error.message);
        }
    };

    const toggleComments = (blogId) => {
        setShowComments(prev => ({
            ...prev,
            [blogId]: !prev[blogId]
        }));
    };

    const handleOpenChat = (user) => {
        setSelectedChat(user);
        fetchConversation(user.id);
        setShowMessageView(true);
        if (isMobile) {
            setShowMobileMenu(false);
        }
    };

    const handleLogout = () => {
        setCurrentUser(null);
        setActiveTab('home');
        setShowMobileMenu(false);
        setShowMessageView(false);
        setLikedPosts(new Set());
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'Vor kurzem';

        const date = new Date(timestamp);
        const now = new Date();
        const diffInMinutes = Math.floor((now - date) / (1000 * 60));

        if (diffInMinutes < 1) return 'Gerade eben';
        if (diffInMinutes < 60) return `Vor ${diffInMinutes} Minuten`;

        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `Vor ${diffInHours} Stunden`;

        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return `Vor ${diffInDays} Tagen`;

        return date.toLocaleDateString();
    };

    // Navigation component
    const Navigation = ({ className = "" }) => (
        <nav className={`space-y-2 ${className}`}>
            <button
                onClick={() => {
                    setActiveTab('home');
                    setShowMessageView(false);
                    setShowMobileMenu(false);
                }}
                className={`flex items-center space-x-3 w-full p-3 rounded-full hover:bg-gray-900 transition ${
                    activeTab === 'home' ? 'bg-gray-900' : ''
                }`}
            >
                <Home className="h-6 w-6" />
                <span className="text-xl">Startseite</span>
            </button>

            <button
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center space-x-3 w-full p-3 rounded-full hover:bg-gray-900 transition"
            >
                <Search className="h-6 w-6" />
                <span className="text-xl">Entdecken</span>
            </button>

            <button
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center space-x-3 w-full p-3 rounded-full hover:bg-gray-900 transition"
            >
                <Bell className="h-6 w-6" />
                <span className="text-xl">Benachrichtigungen</span>
            </button>

            <button
                onClick={() => {
                    setActiveTab('messages');
                    setShowMessageView(true);
                    setShowMobileMenu(false);
                    fetchUnreadMessages();
                }}
                className={`flex items-center space-x-3 w-full p-3 rounded-full hover:bg-gray-900 transition ${
                    activeTab === 'messages' ? 'bg-gray-900' : ''
                }`}
            >
                <Mail className="h-6 w-6" />
                <div className="flex items-center">
                    <span className="text-xl">Nachrichten</span>
                    {unreadMessages.length > 0 && (
                        <span className="ml-2 bg-blue-500 text-xs rounded-full px-2 py-1">
                            {unreadMessages.length}
                        </span>
                    )}
                </div>
            </button>

            <button
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center space-x-3 w-full p-3 rounded-full hover:bg-gray-900 transition"
            >
                <Bookmark className="h-6 w-6" />
                <span className="text-xl">Lesezeichen</span>
            </button>

            <button
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center space-x-3 w-full p-3 rounded-full hover:bg-gray-900 transition"
            >
                <Users className="h-6 w-6" />
                <span className="text-xl">Communities</span>
            </button>

            <button
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center space-x-3 w-full p-3 rounded-full hover:bg-gray-900 transition"
            >
                <User className="h-6 w-6" />
                <span className="text-xl">Profil</span>
            </button>
        </nav>
    );

    // Message View
    const MessageView = () => (
        <div className="h-full flex flex-col">
            <div className="sticky top-0 bg-black bg-opacity-80 backdrop-blur p-4 border-b border-gray-800 flex items-center justify-between">
                <h1 className="text-xl font-bold">
                    {selectedChat ? `Chat mit ${selectedChat.username}` : 'Nachrichten'}
                </h1>
                {isMobile && selectedChat && (
                    <button
                        onClick={() => setSelectedChat(null)}
                        className="p-2 hover:bg-gray-900 rounded-full transition"
                    >
                        <X className="h-5 w-5" />
                    </button>
                )}
            </div>

            {!selectedChat ? (
                <div className="flex-1 overflow-y-auto">
                    <div className="p-4">
                        <h2 className="text-lg font-semibold mb-4">Chats</h2>
                        {users.filter(user => user.id !== currentUser.id).map(user => (
                            <div
                                key={user.id}
                                onClick={() => handleOpenChat(user)}
                                className="flex items-center p-3 hover:bg-gray-900 rounded-lg cursor-pointer transition"
                            >
                                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mr-3">
                                    <User className="h-6 w-6" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-semibold">{user.username}</h3>
                                        {unreadMessages.some(msg => msg.sender && msg.sender.id === user.id) && (
                                            <span className="bg-blue-500 h-3 w-3 rounded-full"></span>
                                        )}
                                    </div>
                                    <p className="text-gray-400 text-sm truncate">
                                        Tippe, um zu chatten
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.length === 0 ? (
                            <div className="text-center p-6 text-gray-500">
                                <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                <p>Keine Nachrichten vorhanden. Starte die Unterhaltung!</p>
                            </div>
                        ) : (
                            messages.map(message => (
                                <div
                                    key={message.id}
                                    className={`flex ${message.sender && message.sender.id === currentUser.id ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-3/4 rounded-lg px-4 py-2 ${
                                            message.sender && message.sender.id === currentUser.id
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-800 text-white'
                                        }`}
                                    >
                                        <p>{message.content}</p>
                                        <p className="text-xs opacity-70 mt-1">
                                            {formatDate(message.sentAt)}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="p-4 border-t border-gray-800">
                        <div className="flex space-x-2">
                            <input
                                type="text"
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                                placeholder="Schreibe eine Nachricht..."
                                className="flex-1 bg-gray-800 text-white rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={!messageInput.trim()}
                                className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-800 text-white rounded-full p-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );

    // Login Screen
    if (!currentUser) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
                <div className="bg-gray-900 p-6 md:p-8 rounded-2xl shadow-2xl w-full max-w-md">
                    <div className="text-center mb-8">
                        <MessageCircle className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                        <h1 className="text-2xl md:text-3xl font-bold mb-2">Blog Platform</h1>
                        <p className="text-gray-400">Melde dich an, um loszulegen</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <input
                                type="text"
                                placeholder="Benutzername"
                                value={loginUsername}
                                onChange={(e) => setLoginUsername(e.target.value)}
                                className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
                                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                            />
                        </div>
                        <div>
                            <input
                                type="password"
                                placeholder="Passwort"
                                value={loginPassword}
                                onChange={(e) => setLoginPassword(e.target.value)}
                                className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
                                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                            />
                        </div>
                        <button
                            onClick={handleLogin}
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold py-3 rounded-lg transition duration-200"
                        >
                            {loading ? 'Anmelden...' : 'Anmelden'}
                        </button>
                    </div>

                    <div className="mt-6 p-4 bg-gray-800 rounded-lg">
                        <p className="text-sm text-gray-400 mb-2">Verfügbare Benutzer:</p>
                        <div className="flex flex-wrap gap-2">
                            {users.slice(0, 8).map(user => (
                                <span key={user.id} className="text-xs bg-gray-700 px-2 py-1 rounded">
                                    {user.username}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Main App
    return (
        <div className="min-h-screen bg-black text-white">
            {/* Mobile Menu Overlay */}
            {isMobile && showMobileMenu && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
                    <div className="fixed left-0 top-0 h-full w-80 bg-black p-4 overflow-y-auto">
                        <div className="flex justify-between items-center mb-8">
                            <MessageCircle className="h-8 w-8 text-blue-500" />
                            <button
                                onClick={() => setShowMobileMenu(false)}
                                className="p-2 hover:bg-gray-900 rounded-full"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <Navigation />

                        <div className="mt-8">
                            <button
                                onClick={() => {
                                    setShowNewBlogForm(!showNewBlogForm);
                                    setShowMobileMenu(false);
                                }}
                                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-full transition"
                            >
                                Posten
                            </button>
                        </div>

                        <div className="mt-8">
                            <div className="flex items-center justify-between bg-gray-900 p-3 rounded-full">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                                        <User className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="font-semibold">{currentUser.username}</p>
                                        <p className="text-sm text-gray-400">@{currentUser.username}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="p-2 hover:bg-gray-800 rounded-full transition"
                                >
                                    <LogOut className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className={`${isMobile ? '' : 'max-w-6xl mx-auto'} flex h-screen`}>
                {/* Desktop Sidebar */}
                {!isMobile && (
                    <div className="w-64 p-4 border-r border-gray-800 h-screen overflow-y-auto">
                        <div className="mb-8">
                            <MessageCircle className="h-8 w-8 text-blue-500" />
                        </div>

                        <Navigation />

                        <div className="mt-8">
                            <button
                                onClick={() => setShowNewBlogForm(!showNewBlogForm)}
                                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-full transition"
                            >
                                Posten
                            </button>
                        </div>

                        <div className="mt-8">
                            <div className="flex items-center justify-between bg-gray-900 p-3 rounded-full">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                                        <User className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="font-semibold">{currentUser.username}</p>
                                        <p className="text-sm text-gray-400">@{currentUser.username}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="p-2 hover:bg-gray-800 rounded-full transition"
                                >
                                    <LogOut className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Content */}
                <div className={`flex-1 ${isMobile ? '' : 'border-r border-gray-800'} h-screen overflow-y-auto`}>
                    {/* Header */}
                    <div className="sticky top-0 bg-black bg-opacity-80 backdrop-blur p-4 border-b border-gray-800 flex items-center justify-between z-10">
                        <h1 className="text-xl font-bold">
                            {showMessageView ? 'Nachrichten' : 'Startseite'}
                        </h1>
                        {isMobile && (
                            <div className="flex items-center space-x-3">
                                <button
                                    onClick={() => setShowNewBlogForm(!showNewBlogForm)}
                                    className="p-2 bg-blue-500 rounded-full hover:bg-blue-600 transition"
                                >
                                    <Plus className="h-5 w-5" />
                                </button>
                                <button
                                    onClick={() => setShowMobileMenu(true)}
                                    className="p-2 hover:bg-gray-900 rounded-full transition"
                                >
                                    <Menu className="h-6 w-6" />
                                </button>
                            </div>
                        )}
                    </div>

                    {showMessageView ? (
                        <MessageView />
                    ) : (
                        <>
                            {/* New Blog Form */}
                            {showNewBlogForm && (
                                <div className="border-b border-gray-800 p-4">
                                    <div className="space-y-4">
                                        <div className="flex space-x-3">
                                            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                                                <User className="h-6 w-6" />
                                            </div>
                                            <div className="flex-1 space-y-3">
                                                <input
                                                    type="text"
                                                    placeholder="Titel deines Posts..."
                                                    value={newBlogTitle}
                                                    onChange={(e) => setNewBlogTitle(e.target.value)}
                                                    className="w-full bg-transparent text-lg md:text-xl placeholder-gray-500 border-none outline-none"
                                                />
                                                <textarea
                                                    placeholder="Was passiert gerade?"
                                                    value={newBlogContent}
                                                    onChange={(e) => setNewBlogContent(e.target.value)}
                                                    className="w-full bg-transparent text-base md:text-lg placeholder-gray-500 border-none outline-none resize-none"
                                                    rows="3"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <div className="flex space-x-4 text-blue-500">
                                                {/* Placeholder icons for media, etc. */}
                                            </div>
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => setShowNewBlogForm(false)}
                                                    className="px-4 py-2 border border-gray-600 text-gray-400 rounded-full hover:bg-gray-900 transition text-sm"
                                                >
                                                    Abbrechen
                                                </button>
                                                <button
                                                    onClick={handleCreateBlog}
                                                    disabled={loading || !newBlogTitle.trim() || !newBlogContent.trim()}
                                                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-800 text-white font-semibold rounded-full transition text-sm"
                                                >
                                                    {loading ? 'Posten...' : 'Posten'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Blog Feed */}
                            <div className="space-y-0">
                                {blogs.map((blog) => (
                                    <div key={blog.id} className="border-b border-gray-800 p-4 hover:bg-gray-950 hover:bg-opacity-50 transition">
                                        <div className="flex space-x-3">
                                            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                                                <User className="h-6 w-6" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center space-x-2 mb-1 flex-wrap">
                                                    <h3 className="font-semibold">{blog.blogUser?.username || 'Unbekannt'}</h3>
                                                    <span className="text-gray-500">@{blog.blogUser?.username || 'unknown'}</span>
                                                    <span className="text-gray-500">·</span>
                                                    <span className="text-gray-500 text-sm">{formatDate(blog.dateCreated)}</span>
                                                </div>
                                                <h4 className="font-semibold text-lg mb-2 break-words">{blog.title}</h4>
                                                <p className="text-gray-200 mb-3 break-words">{blog.content}</p>

                                                <div className="flex space-x-6 text-gray-500 mb-3">
                                                    <button
                                                        onClick={() => toggleComments(blog.id)}
                                                        className="flex items-center space-x-2 hover:text-blue-500 transition"
                                                    >
                                                        <MessageCircle className="h-5 w-5" />
                                                        <span>{blog.comments?.length || 0}</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleLike(blog.id)}
                                                        className="flex items-center space-x-2 hover:text-red-500 transition"
                                                    >
                                                        <Heart
                                                            className={`h-5 w-5 ${likedPosts.has(blog.id) ? 'text-red-500 fill-current' : ''}`}
                                                        />
                                                        <span>{blog.likes?.length || 0}</span>
                                                    </button>
                                                    <button className="flex items-center space-x-2 hover:text-green-500 transition">
                                                        <Share className="h-5 w-5" />
                                                        <span>0</span>
                                                    </button>
                                                </div>

                                                {/* Comments Section */}
                                                {showComments[blog.id] && (
                                                    <div className="mt-4 pt-4 border-t border-gray-800">
                                                        {/* Comment Input */}
                                                        <div className="flex space-x-3 mb-4">
                                                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                                                                <User className="h-4 w-4" />
                                                            </div>
                                                            <div className="flex-1 flex space-x-2">
                                                                <input
                                                                    type="text"
                                                                    placeholder="Kommentieren..."
                                                                    value={commentInputs[blog.id] || ''}
                                                                    onChange={(e) => setCommentInputs(prev => ({ ...prev, [blog.id]: e.target.value }))}
                                                                    className="flex-1 bg-gray-900 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                    onKeyPress={(e) => e.key === 'Enter' && handleComment(blog.id)}
                                                                />
                                                                <button
                                                                    onClick={() => handleComment(blog.id)}
                                                                    disabled={!commentInputs[blog.id]?.trim()}
                                                                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-800 text-white rounded-full text-sm transition"
                                                                >
                                                                    Senden
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Comments List */}
                                                        {blog.comments && blog.comments.length > 0 ? (
                                                            blog.comments.map((comment) => (
                                                                <div key={comment.id} className="flex space-x-3 mb-3">
                                                                    <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                                                                        <User className="h-4 w-4" />
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <div className="flex items-center space-x-2 mb-1">
                                                                            <span className="font-semibold text-sm">{comment.user?.username || 'Anonym'}</span>
                                                                            <span className="text-gray-500 text-xs">{formatDate(comment.createdAt)}</span>
                                                                        </div>
                                                                        <p className="text-sm text-gray-200 break-words">{comment.content}</p>
                                                                    </div>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <p className="text-center text-gray-500 text-sm py-2">Keine Kommentare vorhanden</p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {blogs.length === 0 && (
                                    <div className="p-8 text-center text-gray-500">
                                        <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                                        <h3 className="text-xl font-semibold mb-2">Keine Posts vorhanden</h3>
                                        <p>Sei der Erste, der etwas postet!</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Right Sidebar - Hidden on mobile */}
                {!isMobile && (
                    <div className="w-80 p-4 h-screen overflow-y-auto">
                        <div className="bg-gray-900 rounded-2xl p-4 mb-4">
                            <h2 className="text-xl font-bold mb-3">Trends für dich</h2>
                            <div className="space-y-3">
                                <div className="hover:bg-gray-800 p-2 rounded cursor-pointer">
                                    <p className="text-sm text-gray-500">Trending in Schweiz</p>
                                    <p className="font-semibold">#Winterthur</p>
                                    <p className="text-sm text-gray-500">2,847 Posts</p>
                                </div>
                                <div className="hover:bg-gray-800 p-2 rounded cursor-pointer">
                                    <p className="text-sm text-gray-500">Trending</p>
                                    <p className="font-semibold">#Blogging</p>
                                    <p className="text-sm text-gray-500">1,234 Posts</p>
                                </div>
                                <div className="hover:bg-gray-800 p-2 rounded cursor-pointer">
                                    <p className="text-sm text-gray-500">Trending in Tech</p>
                                    <p className="font-semibold">#SpringBoot</p>
                                    <p className="text-sm text-gray-500">892 Posts</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-900 rounded-2xl p-4">
                            <h2 className="text-xl font-bold mb-3">Nachrichten</h2>
                            <div className="space-y-3">
                                {users.slice(0, 3).filter(user => user.id !== currentUser.id).map((user) => (
                                    <div key={user.id} className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                                                <User className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="font-semibold">{user.username}</p>
                                                <p className="text-sm text-gray-500">@{user.username}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleOpenChat(user)}
                                            className="bg-white text-black px-4 py-1 rounded-full font-semibold hover:bg-gray-200 transition"
                                        >
                                            Nachricht
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BloggingPlatform;