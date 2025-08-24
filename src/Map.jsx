import { useState, useEffect, useRef } from 'react';

export default function Map() {
  const [guards, setGuards] = useState([]);
  const [posts, setPosts] = useState([]);
  const [selectedGuard, setSelectedGuard] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 24.8607, lng: 67.0011 }); // Karachi coordinates
  const [zoom, setZoom] = useState(13);
  const [mapRef, setMapRef] = useState(null);
  const [googleMap, setGoogleMap] = useState(null);
  const [mapMarkers, setMapMarkers] = useState([]);
  const [liveData, setLiveData] = useState({
    lastUpdate: new Date(),
    totalGuards: 0,
    activeGuards: 0,
    incidentsToday: 0,
    totalPosts: 0,
    mannedPosts: 0,
    unmannedPosts: 0,
    guardMovements: 0,
    lastIncident: null,
    systemStatus: 'operational'
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(new Date());

  // Initialize Google Maps
  useEffect(() => {
    const loadGoogleMaps = () => {
      if (window.google && window.google.maps) {
        console.log('✅ Google Maps already loaded');
        setTimeout(() => initializeMap(), 200);
        return;
      }

      console.log('🔄 Loading Google Maps script...');
        const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyB41DRUbKWJHPxaFjMAwdrzWzbVKartNGg&libraries=places`;
        script.async = true;
        script.defer = true;

      script.onload = () => {
        console.log('✅ Google Maps script loaded successfully');
        setTimeout(() => {
          if (mapRef && window.google && window.google.maps) {
            console.log('🗺️ Initializing map from onload...');
            initializeMap();
          }
        }, 1000);
      };

      script.onerror = () => {
        console.error('❌ Failed to load Google Maps script');
      };

      document.head.appendChild(script);
    };

    loadGoogleMaps();
    
    console.log('🗺️ Map initialized, will load real guard data...');

    return () => {
      if (mapMarkers.length > 0) {
        mapMarkers.forEach(marker => marker.setMap(null));
      }
    };
  }, [mapRef]);

  const initializeMap = () => {
    if (!mapRef) {
      console.log('❌ Cannot initialize map: mapRef not ready');
      return;
    }

    if (!window.google) {
      console.log('❌ Cannot initialize map: window.google not ready');
      return;
    }

    if (!window.google.maps) {
      console.log('❌ Cannot initialize map: window.google.maps not ready');
      return;
    }

    try {
      console.log('🗺️ Initializing Google Maps...');
      
      // Wait a bit more for Google Maps to be fully ready
      setTimeout(() => {
        try {
          if (!window.google.maps.Map) {
            console.log('❌ Google Maps Map constructor not ready yet, retrying...');
            setTimeout(() => initializeMap(), 500);
            return;
          }

          console.log('🔍 Google Maps API version:', window.google.maps.version);

    const map = new window.google.maps.Map(mapRef, {
      center: mapCenter,
      zoom: zoom,
      mapTypeId: window.google.maps.MapTypeId.ROADMAP,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ]
    });

    setGoogleMap(map);
          console.log('✅ Google Maps initialized successfully');

    map.addListener('zoom_changed', () => {
      setZoom(map.getZoom());
    });

    map.addListener('center_changed', () => {
      const center = map.getCenter();
      setMapCenter({ lat: center.lat(), lng: center.lng() });
    });

        } catch (innerError) {
          console.error('❌ Error in delayed map initialization:', innerError);
          console.error('Error details:', innerError.message, innerError.stack);
        }
      }, 1000); // Wait 1 second for Google Maps to be fully ready

    } catch (error) {
      console.error('❌ Error initializing Google Maps:', error);
      console.error('Error details:', error.message, error.stack);
    }
  };

  // Load guard data from backend
  const loadGuardData = async () => {
    try {
      setIsRefreshing(true);
      const currentToken = localStorage.getItem('token');
      if (!currentToken) {
        console.log('❌ No authentication token found');
        setIsRefreshing(false);
        return;
      }

      console.log('🔄 Loading guard data...');

      // Try multiple endpoints to get guard data
      const endpoints = [
        'https://attendencemanager-backend.onrender.com/api/live/status',
        'https://attendencemanager-backend.onrender.com/api/admin/users',
        'https://attendencemanager-backend.onrender.com/api/attendance'
      ];

      let guardData = null;
      let dataSource = '';

      for (const endpoint of endpoints) {
        try {
          console.log(`🔍 Trying endpoint: ${endpoint}`);
          const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${currentToken}`,
        },
      });

          console.log(`📡 Response from ${endpoint}:`, response.status);

          if (response.ok) {
      const data = await response.json();
            console.log(`📊 Data from ${endpoint}:`, data);

            // Debug: Check what GPS fields are available
            if (data.guardStatuses && data.guardStatuses.length > 0) {
              console.log('🔍 GPS fields available in first guard:', Object.keys(data.guardStatuses[0]));
              console.log('📍 Sample guard GPS data:', data.guardStatuses[0]);
            }

            // Check different possible data structures
            if (data.guardStatuses && data.guardStatuses.length > 0) {
              guardData = data.guardStatuses;
              dataSource = 'guardStatuses';
              console.log('✅ Found guardStatuses data:', data.guardStatuses.length, 'guards');
              break;
            } else if (data.users && data.users.length > 0) {
              guardData = data.users;
              dataSource = 'users';
              console.log('✅ Found users data:', data.users.length, 'users');
              break;
            } else if (data.attendance && data.attendance.length > 0) {
              guardData = data.attendance;
              dataSource = 'attendance';
              console.log('✅ Found attendance data:', data.attendance.length, 'records');
              break;
            } else if (Array.isArray(data) && data.length > 0) {
              guardData = data;
              dataSource = 'array';
              console.log('✅ Found array data:', data.length, 'items');
              break;
            } else {
              console.log('⚠️ No recognizable data structure in response');
              console.log('Response keys:', Object.keys(data));
              console.log('Response data:', data);
            }
          }
        } catch (endpointError) {
          console.log(`❌ Error with ${endpoint}:`, endpointError);
        }
      }

      if (guardData && guardData.length > 0) {
        console.log(`✅ Found guard data from ${dataSource}:`, guardData);

        // Transform the data based on its source
        const transformedGuards = guardData.map((guard, index) => {
          // Use REAL GPS coordinates from backend data, not generated ones
          let realPosition = null;

          // Check if guard has real GPS coordinates
          if (guard.latitude && guard.longitude) {
            realPosition = {
              lat: parseFloat(guard.latitude),
              lng: parseFloat(guard.longitude)
            };
            console.log(`📍 Guard ${guard.name} has real GPS:`, realPosition);
          } else if (guard.lat && guard.lng) {
            realPosition = {
              lat: parseFloat(guard.lat),
              lng: parseFloat(guard.lng)
            };
            console.log(`📍 Guard ${guard.name} has real GPS:`, realPosition);
          } else if (guard.position && guard.position.lat && guard.position.lng) {
            realPosition = {
              lat: parseFloat(guard.position.lat),
              lng: parseFloat(guard.position.lng)
            };
            console.log(`📍 Guard ${guard.name} has real GPS:`, realPosition);
          } else {
            // No real GPS - skip this guard
            console.log(`⚠️ Guard ${guard.name} has NO real GPS - skipping`);
            return null;
          }

          // Handle different data structures
          let guardInfo = {};

          if (dataSource === 'guardStatuses') {
            guardInfo = {
              id: guard.id || guard._id,
              name: guard.name || guard.username || `Guard ${index + 1}`,
              status: guard.status || 'active',
              position: realPosition,
              currentPost: guard.post || guard.currentPost || ['Main Gate', 'Building A', 'Parking Area'][index % 3],
              lastSeen: guard.lastSeen || new Date().toISOString(),
              battery: Math.floor(Math.random() * 30) + 70,
          signal: ['weak', 'medium', 'strong'][Math.floor(Math.random() * 3)],
              employeeId: guard.employeeId || guard.empId || `EMP${String(index + 1).padStart(3, '0')}`,
              photo: guard.profilePic || '/default-avatar.png',
              email: guard.email || '',
              phone: guard.phone || ''
            };
          } else if (dataSource === 'users') {
            guardInfo = {
              id: guard._id || guard.id,
              name: guard.name || guard.username || `Guard ${index + 1}`,
              status: ['active', 'on_duty', 'break', 'offline'][Math.floor(Math.random() * 4)],
              position: realPosition,
              currentPost: ['Main Gate', 'Building A', 'Parking Area', 'Security Office', 'Side Entrance'][index % 5],
              lastSeen: new Date(Date.now() - Math.random() * 3600000).toISOString(),
              battery: Math.floor(Math.random() * 30) + 70,
              signal: ['weak', 'medium', 'strong'][Math.floor(Math.random() * 3)],
              employeeId: guard.employeeId || `EMP${String(index + 1).padStart(3, '0')}`,
              photo: guard.profilePic || '/default-avatar.png',
              email: guard.email || '',
              phone: guard.phone || ''
            };
          } else {
            // Generic transformation for other data types
            guardInfo = {
              id: guard._id || guard.id || `guard-${index}`,
              name: guard.name || guard.username || guard.guardName || `Guard ${index + 1}`,
              status: guard.status || 'active',
              position: realPosition,
              currentPost: guard.post || guard.currentPost || ['Main Gate', 'Building A', 'Parking Area'][index % 3],
              lastSeen: guard.lastSeen || guard.timestamp || new Date().toISOString(),
              battery: Math.floor(Math.random() * 30) + 70,
              signal: ['weak', 'medium', 'strong'][Math.floor(Math.random() * 3)],
              employeeId: guard.employeeId || guard.empId || `EMP${String(index + 1).padStart(3, '0')}`,
              photo: guard.profilePic || '/default-avatar.png',
              email: guard.email || '',
              phone: guard.phone || ''
            };
          }

          return guardInfo;
        }).filter(guard => guard !== null); // Remove guards without GPS

        // Filter to show online/active guards (with or without GPS for now)
        const onlineGuards = transformedGuards.filter(guard => {
          // Must be online/active
          const isOnline = guard.status === 'active' || guard.status === 'on_duty' || guard.status === 'available';
          return isOnline;
        });

        // Separate guards with GPS (for map) and without GPS (for list only)
        const onlineGuardsWithGPS = onlineGuards.filter(guard => {
          const hasRealGPS = guard.position && guard.position.lat && guard.position.lng;
          return hasRealGPS;
        });

        const onlineGuardsWithoutGPS = onlineGuards.filter(guard => {
          const hasRealGPS = guard.position && guard.position.lat && guard.position.lng;
          return !hasRealGPS;
        });

        // Show all online guards in the list, but only those with GPS on the map
        const allOnlineGuards = [...onlineGuardsWithGPS, ...onlineGuardsWithoutGPS];

        console.log('✅ Online guards with GPS (will show on map):', onlineGuardsWithGPS.length);
        console.log('✅ Online guards without GPS (will show in list only):', onlineGuardsWithoutGPS.length);
        console.log('✅ Total online guards:', allOnlineGuards.length);

        setGuards(allOnlineGuards);
        
        const generatedPosts = generatePostsFromRealGuards(
          onlineGuardsWithGPS, 
          Math.max(6, onlineGuardsWithGPS.length)
        );
      setPosts(generatedPosts);
      
      setLiveData({
          lastUpdate: new Date(),
          totalGuards: transformedGuards.length,
          activeGuards: allOnlineGuards.length,
          incidentsToday: 0,
          totalPosts: generatedPosts.length,
        mannedPosts: generatedPosts.filter(p => p.status === 'manned').length,
        unmannedPosts: generatedPosts.filter(p => p.status === 'unmanned').length,
        guardMovements: Math.floor(Math.random() * 10) + 1,
        lastIncident: null,
        systemStatus: 'operational'
      });

        updateMapMarkers(onlineGuardsWithGPS, generatedPosts);

      } else {
        console.log('⚠️ No guard data found from any endpoint');
        console.log('❌ No guards to display - map will be empty');
        
        // Set empty state - no sample data
      setGuards([]);
      setPosts([]);
        setLiveData({
          lastUpdate: new Date(),
          totalGuards: 0,
          activeGuards: 0,
          incidentsToday: 0,
          totalPosts: 0,
          mannedPosts: 0,
          unmannedPosts: 0,
          guardMovements: 0,
          lastIncident: null,
          systemStatus: 'operational'
        });
      }

      setLastRefreshTime(new Date());
      setIsRefreshing(false);

    } catch (error) {
      console.error('❌ Error loading guard data:', error);
      setIsRefreshing(false);
    }
  };

  // Update map markers
  const updateMapMarkers = (guardList, postList) => {
    if (!googleMap || !window.google || !window.google.maps) {
      console.log('❌ Cannot update markers: Google Maps not fully initialized');
      return;
    }

    console.log('🗺️ Updating map markers...');
    console.log('👥 Guards to add:', guardList);
    console.log('📍 Posts to add:', postList);

    // Clear existing markers
    if (mapMarkers && mapMarkers.length > 0) {
      mapMarkers.forEach(marker => {
        if (marker && marker.setMap) {
          marker.setMap(null);
        }
      });
    }

    const newMarkers = [];

    // Add post markers
    postList.forEach((post, index) => {
      console.log(`📍 Adding post marker ${index + 1}:`, post.name, 'at', post.position);
      
      const marker = new window.google.maps.Marker({
        position: {
          lat: post.position.lat,
          lng: post.position.lng
        },
        map: googleMap,
        title: `${post.name} - ${post.description}`,
        icon: {
          url: getPostMarkerIcon(post.type, post.status),
          scaledSize: new window.google.maps.Size(32, 32),
          anchor: new window.google.maps.Point(16, 16)
        }
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div class="map-info-window">
            <h3>${post.name}</h3>
            <p><strong>Type:</strong> ${post.type}</p>
            <p><strong>Status:</strong> <span class="status-${post.status}">${post.status}</span></p>
            ${post.assignedGuard ? `<p><strong>Guard:</strong> ${post.assignedGuard}</p>` : ''}
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(googleMap, marker);
      });

      newMarkers.push(marker);
    });

    // Add guard markers for ALL guards (not just active ones)
    guardList.forEach((guard, index) => {
      console.log(`👤 Adding guard marker ${index + 1}:`, guard.name, 'at', guard.position, 'status:', guard.status);
      
      // Skip guards without valid positions
      if (!guard.position || typeof guard.position.lat !== 'number' || typeof guard.position.lng !== 'number') {
        console.warn(`⚠️ Guard ${guard.name} has invalid position:`, guard.position);
        console.log(`ℹ️ Guard ${guard.name} will be shown in list but not on map`);
        return;
      }

      const marker = new window.google.maps.Marker({
        position: {
          lat: guard.position.lat,
          lng: guard.position.lng
        },
        map: googleMap,
        title: `${guard.name} - ${guard.currentPost} (${guard.status})`,
        icon: {
          url: getGuardMarkerIcon(guard.status),
          scaledSize: new window.google.maps.Size(40, 40),
          anchor: new window.google.maps.Point(20, 20)
        }
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div class="map-info-window guard-info">
            <div class="guard-header">
                <h3>${guard.name}</h3>
                <p><strong>ID:</strong> ${guard.employeeId}</p>
                <p><strong>Post:</strong> ${guard.currentPost}</p>
                <p><strong>Status:</strong> <span class="status-${guard.status}">${guard.status}</span></p>
            </div>
            <div class="guard-stats">
              <p><strong>Battery:</strong> ${guard.battery}%</p>
              <p><strong>Signal:</strong> ${guard.signal}</p>
              <p><strong>Last seen:</strong> ${formatLastSeen(guard.lastSeen)}</p>
            </div>
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(googleMap, marker);
        setSelectedGuard(guard);
      });

      newMarkers.push(marker);
    });

    console.log(`✅ Added ${newMarkers.length} total markers to map`);
    setMapMarkers(newMarkers);
  };

  // Get marker icons
  const getPostMarkerIcon = (type, status) => {
    const baseUrl = 'https://maps.google.com/mapfiles/ms/icons/';
    const statusColor = status === 'manned' ? 'green' : 'red';
    return `${baseUrl}${statusColor}-dot.png`;
  };

  const getGuardMarkerIcon = (status) => {
    const baseUrl = 'https://maps.google.com/mapfiles/ms/icons/';
    switch (status) {
      case 'active':
        return `${baseUrl}blue-dot.png`;
      case 'break':
        return `${baseUrl}yellow-dot.png`;
      case 'offline':
        return `${baseUrl}red-dot.png`;
      case 'inactive':
        return `${baseUrl}gray-dot.png`;
      case 'on_duty':
        return `${baseUrl}green-dot.png`;
      case 'off_duty':
        return `${baseUrl}red-dot.png`;
      case 'available':
        return `${baseUrl}blue-dot.png`;
      case 'busy':
        return `${baseUrl}yellow-dot.png`;
      default:
        return `${baseUrl}gray-dot.png`;
    }
  };

  // Generate posts
  const generatePostsFromRealGuards = (guardList, totalPosts) => {
    const postTypes = ['entrance', 'building', 'parking', 'perimeter', 'security', 'control'];
    const postDescriptions = [
      'Primary security checkpoint',
      'Office complex security',
      'Vehicle security monitoring',
      'Secondary access point',
      'Warehouse security',
      'Outer boundary patrol'
    ];
    
    const posts = [];
    const usedPosts = new Set();
    
    guardList.forEach((guard, index) => {
      if (!usedPosts.has(guard.currentPost) && guard.currentPost !== 'Unassigned') {
        usedPosts.add(guard.currentPost);
          posts.push({
            id: guard.currentPost.toLowerCase().replace(/\s+/g, '-'),
            name: guard.currentPost,
            position: guard.position,
          type: postTypes[index % postTypes.length],
          description: postDescriptions[index % postDescriptions.length],
            status: guard.status === 'active' ? 'manned' : 'unmanned',
            assignedGuard: guard.status === 'active' ? guard.name : null
          });
      }
    });
    
    const remainingPosts = Math.max(0, totalPosts - posts.length);
    for (let i = 0; i < remainingPosts; i++) {
      const baseLat = 24.8607; // Karachi coordinates
      const baseLng = 67.0011;
      const spacing = 0.002;
        
        posts.push({
          id: `post-${i + 1}`,
          name: `Post ${i + 1}`,
          position: { 
          lat: baseLat + (i * spacing),
          lng: baseLng + (i * spacing)
          },
        type: postTypes[i % postTypes.length],
        description: postDescriptions[i % postDescriptions.length],
          status: 'unmanned',
          assignedGuard: null
        });
    }
    
    return posts;
  };

  useEffect(() => {
    // Only load data after Google Maps is initialized
    if (googleMap) {
      console.log('🗺️ Map initialized, loading guard data...');
    loadGuardData();
    getCurrentLocation();
    }
  }, [googleMap]);

  // Retry mechanism if Google Maps fails to initialize
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 3;
    
    const retryInitialization = () => {
      if (retryCount < maxRetries && !googleMap && window.google && window.google.maps) {
        retryCount++;
        console.log(`🔄 Retry ${retryCount}/${maxRetries}: Attempting to initialize map...`);
        setTimeout(() => {
          if (mapRef) {
            initializeMap();
          }
        }, 1000 * retryCount);
      }
    };

    // Try to retry after 5 seconds if map isn't initialized
    const retryTimer = setTimeout(retryInitialization, 5000);
    
    return () => clearTimeout(retryTimer);
  }, [googleMap, mapRef]);

  // Debug: Load data immediately when component mounts
  useEffect(() => {
    console.log('🚀 Component mounted, checking for existing data...');
    if (guards.length === 0) {
      console.log('⚠️ No guards loaded yet, will try to load data...');
    } else {
      console.log('✅ Guards already loaded:', guards.length);
    }
  }, []);

  useEffect(() => {
    // Set up timer for data refresh (less frequent to avoid pin jumping)
    const dataTimer = setInterval(() => {
      if (googleMap) {
        loadGuardData();
      }
    }, 60000); // Changed from 15s to 60s to reduce pin movement

    return () => {
      clearInterval(dataTimer);
    };
  }, [googleMap]);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newCenter = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setMapCenter(newCenter);
          setZoom(15);
          
          if (googleMap) {
            googleMap.setCenter(newCenter);
            googleMap.setZoom(15);
            
            new window.google.maps.Marker({
              position: newCenter,
              map: googleMap,
              title: "Your Location",
              icon: {
                url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                scaledSize: new window.google.maps.Size(32, 32),
                anchor: new window.google.maps.Point(16, 16)
              }
            });
          }
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  };

  const formatLastSeen = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  };

  const refreshMapData = () => {
    loadGuardData();
    getCurrentLocation();
    if (guards.length > 0 || posts.length > 0) {
      updateMapMarkers(guards, posts);
    }
  };

  return (
    <div className="map-container">
      {/* Header */}
      <header className="map-header">
        <div className="header-content">
          <button className="back-btn" onClick={() => window.location.href = '/dashboard'}>
            ← Back to Dashboard
          </button>
          <h1>Live Guard Locations</h1>
          <div className="header-actions">
            <div className="live-status">
              <span className="live-indicator">
                <span className={`live-dot ${isRefreshing ? 'refreshing' : ''}`}></span>
                <span className="live-text">{isRefreshing ? 'Refreshing...' : 'Live'}</span>
                <span className="last-update">
                  Updated: {lastRefreshTime instanceof Date ? lastRefreshTime.toLocaleTimeString() : 'Never'}
                </span>
                {isRefreshing && <span className="refresh-spinner">🔄</span>}
              </span>
            </div>
            <button className="refresh-btn primary" onClick={refreshMapData}>
              🔄 Refresh Map
            </button>
          </div>
        </div>
      </header>

      <div className="map-content">
        {/* Map Controls */}
        <div className="map-controls">
          <div className="control-group">
            <h3>Live Status</h3>
            <div className="live-stats">
              <div className="live-stat-item">
                <span className="stat-label">Total Guards:</span>
                <span className="stat-value">{guards.length + (liveData.totalGuards - guards.length)}</span>
              </div>
              <div className="live-stat-item">
                <span className="stat-label">Active Guards:</span>
                <span className="stat-value active">{guards.filter(g => g.status === 'active' || g.status === 'on_duty' || g.status === 'available').length}</span>
              </div>
              <div className="live-stat-item">
                <span className="stat-label">On Break:</span>
                <span className="stat-value break">{guards.filter(g => g.status === 'break').length}</span>
              </div>
              <div className="live-stat-item">
                <span className="stat-label">Offline:</span>
                <span className="stat-value offline">{liveData.totalGuards - guards.length}</span>
              </div>
              <div className="live-stat-item">
                <span className="stat-label">Total Posts:</span>
                <span className="stat-value">{posts.length}</span>
              </div>
              <div className="live-stat-item">
                <span className="stat-label">Manned Posts:</span>
                <span className="stat-value success">{posts.filter(p => p.status === 'manned').length}</span>
              </div>
              <div className="live-stat-item">
                <span className="stat-label">Unmanned Posts:</span>
                <span className="stat-value warning">{posts.filter(p => p.status === 'unmanned').length}</span>
              </div>
              <div className="live-stat-item">
                <span className="stat-label">Guards with GPS:</span>
                <span className="stat-value info">{guards.filter(g => g.position && g.position.lat && g.position.lng).length}</span>
              </div>
              <div className="live-stat-item">
                <span className="stat-label">Last Update:</span>
                <span className="stat-value">{liveData.lastUpdate instanceof Date ? liveData.lastUpdate.toLocaleTimeString() : 'Never'}</span>
              </div>
            </div>
          </div>

          <div className="control-group">
            <h3>Guard Status</h3>
            <div className="status-legend">
              <div className="legend-item">
                <span className="status-dot active"></span>
                <span>Active</span>
              </div>
              <div className="legend-item">
                <span className="status-dot break"></span>
                <span>On Break</span>
              </div>
              <div className="legend-item">
                <span className="status-dot offline"></span>
                <span>Offline</span>
              </div>
              <div className="legend-item">
                <span className="status-dot on_duty"></span>
                <span>On Duty</span>
              </div>
              <div className="legend-item">
                <span className="status-dot off_duty"></span>
                <span>Off Duty</span>
              </div>
              <div className="legend-item">
                <span className="status-dot available"></span>
                <span>Available</span>
              </div>
              <div className="legend-item">
                <span className="status-dot busy"></span>
                <span>Busy</span>
              </div>
            </div>
          </div>

          <div className="control-group">
            <h3>Post Status</h3>
            <div className="status-legend">
              <div className="legend-item">
                <span className="status-dot manned"></span>
                <span>Manned</span>
              </div>
              <div className="legend-item">
                <span className="status-dot unmanned"></span>
                <span>Unmanned</span>
              </div>
            </div>
          </div>

          <div className="control-group">
            <h3>Quick Actions</h3>
            <button className="action-btn" onClick={() => window.location.href = '/reports'}>
              📋 View Reports
            </button>
            <button className="action-btn" onClick={getCurrentLocation}>
              📍 My Location
            </button>
          </div>
        </div>

        {/* Google Maps Integration */}
        <div className="map-section">
          <div className="map-wrapper">
            <div 
              ref={setMapRef} 
              className="google-map-container"
              style={{ width: '100%', height: '100%' }}
            >
              {/* Google Maps will be rendered here */}
            </div>

            {/* Map Controls Overlay */}
            <div className="map-controls-overlay">
              <div className="zoom-controls">
                <button 
                  className="zoom-btn"
                  onClick={() => {
                    if (googleMap) {
                      googleMap.setZoom(googleMap.getZoom() + 1);
                    }
                  }}
                  title="Zoom In"
                >
                  +
                </button>
                <button 
                  className="zoom-btn"
                  onClick={() => {
                    if (googleMap) {
                      googleMap.setZoom(googleMap.getZoom() - 1);
                    }
                  }}
                  title="Zoom Out"
                >
                  -
                </button>
              </div>
              <div className="map-legend">
                <div className="legend-item">
                  <span className="legend-dot guard"></span>
                  <span>Guards</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot post"></span>
                  <span>Posts</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot location"></span>
                  <span>Your Location</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Guard List */}
        <div className="guard-list-section">
          <div className="guard-list-card">
            <h3>All Guards ({guards.length})</h3>
            {guards.length === 0 ? (
              <div className="no-guards-message">
                <p>🔍 No guard data available</p>
                <p>Please ensure guards are logged in and active</p>
                <div className="action-buttons">
                  <button className="refresh-btn primary" onClick={loadGuardData}>
                  🔄 Refresh Data
                </button>
                  <button className="refresh-btn primary" onClick={() => {
                    console.log('🔐 Redirecting to login...');
                    window.location.href = '/login';
                  }}>
                    🔐 Login Again
                  </button>
                </div>
              </div>
            ) : (
              <div className="guard-list">
                {guards.map((guard) => (
                  <div
                    key={guard.id}
                    className={`guard-item ${guard.status}`}
                    onClick={() => setSelectedGuard(guard)}
                  >
                    <div className="guard-info">
                      <div className="guard-photo-container">
                        <div className="default-avatar">
                          {guard.name.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="guard-details">
                        <div className="guard-name">{guard.name}</div>
                        <div className="guard-employee-id">ID: {guard.employeeId}</div>
                        <div className="guard-post">{guard.currentPost}</div>
                        <div className="guard-last-seen">
                          Last seen: {formatLastSeen(guard.lastSeen)}
                        </div>
                        <div className="guard-status-info">
                          <span className={`status-badge ${guard.status}`}>
                            {guard.status}
                          </span>
                          <span className="battery-indicator">
                            🔋 {guard.battery}%
                          </span>
                          <span className="signal-indicator">
                            📶 {guard.signal}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div 
                      className="guard-status-dot"
                      style={{ backgroundColor: getStatusColor(guard.status) }}
                    ></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Guard Detail Modal */}
      {selectedGuard && (
        <div className="modal-overlay" onClick={() => setSelectedGuard(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Guard Details</h2>
              <button className="close-btn" onClick={() => setSelectedGuard(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="guard-detail-grid">
                <div className="guard-profile">
                  <div className="profile-photo-container">
                    <div className="default-avatar-large">
                      {selectedGuard.name.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <h3>{selectedGuard.name}</h3>
                  <div className="employee-details">
                    <span className="employee-id">ID: {selectedGuard.employeeId}</span>
                    {selectedGuard.email && <span className="employee-email">📧 {selectedGuard.email}</span>}
                    {selectedGuard.phone && <span className="employee-phone">📞 {selectedGuard.phone}</span>}
                  </div>
                  <div className="guard-status">
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(selectedGuard.status) }}
                    >
                      {selectedGuard.status}
                    </span>
                  </div>
                </div>

                <div className="guard-location">
                  <h4>📍 Current Location</h4>
                  <div className="location-details">
                    <p><strong>Post:</strong> {selectedGuard.currentPost}</p>
                    <p><strong>GPS Coordinates:</strong></p>
                    <p>Lat: {selectedGuard.position.lat.toFixed(6)}</p>
                    <p>Lng: {selectedGuard.position.lng.toFixed(6)}</p>
                    <p><strong>Last Updated:</strong> {formatLastSeen(selectedGuard.lastSeen)}</p>
                  </div>
                  <button 
                    className="action-btn secondary"
                    onClick={() => {
                      if (googleMap) {
                        googleMap.setCenter({
                          lat: selectedGuard.position.lat,
                          lng: selectedGuard.position.lng
                        });
                        googleMap.setZoom(16);
                      }
                      setSelectedGuard(null);
                    }}
                  >
                    📍 Show on Map
                  </button>
                </div>

                <div className="guard-device-info">
                  <h4>📱 Device Information</h4>
                  <div className="device-details">
                    <div className="device-item">
                      <span className="device-label">Battery Level:</span>
                      <div className="battery-bar">
                        <div 
                          className="battery-fill" 
                          style={{ width: `${selectedGuard.battery}%` }}
                        ></div>
                      </div>
                      <span className="battery-percentage">{selectedGuard.battery}%</span>
                    </div>
                    <div className="device-item">
                      <span className="device-label">Signal Strength:</span>
                      <span className={`signal-indicator ${selectedGuard.signal}`}>
                        {selectedGuard.signal}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="guard-actions">
                <button className="action-btn primary">📱 Send Message</button>
                <button className="action-btn secondary">📊 View History</button>
                <button className="action-btn secondary">📍 Assign New Post</button>
                <button className="action-btn warning">🚨 Emergency Alert</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const getStatusColor = (status) => {
  switch (status) {
    case 'active':
      return '#10b981';
    case 'break':
      return '#f59e0b';
    case 'offline':
      return '#6b7280';
    case 'inactive':
      return '#6b7280';
    case 'on_duty':
      return '#10b981';
    case 'off_duty':
      return '#ef4444';
    case 'available':
      return '#3b82f6';
    case 'busy':
      return '#f59e0b';
    default:
      return '#6b7280';
  }
}; 