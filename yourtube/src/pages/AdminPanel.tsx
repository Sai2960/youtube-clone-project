/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/router";

const AdminPanel = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  const API_URL =
    process.env.NEXT_PUBLIC_API_URL ||
    "https://youtube-clone-project-q3pd.onrender.com";

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      if (!token) {
        router.push("/login");
        return;
      }

      const { data } = await axios.get(`${API_URL}/api/admin/pending-users`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("✅ Pending users:", data);
      setPendingUsers(data.users || []);
      setError("");
    } catch (error: any) {
      console.error("❌ Fetch error:", error);

      if (error.response?.status === 403) {
        setError("You do not have admin access");
      } else if (error.response?.status === 401) {
        router.push("/login");
      } else {
        setError("Failed to fetch pending users");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: string) => {
    try {
      const token = localStorage.getItem("token");

      await axios.put(
        `${API_URL}/api/admin/approve-user/${userId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("User approved successfully!");
      fetchPendingUsers();
    } catch (error) {
      console.error("❌ Approve error:", error);
      alert("Failed to approve user");
    }
  };

  const handleReject = async (userId: string) => {
    if (!window.confirm("Are you sure you want to reject this user?")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");

      await axios.put(
        `${API_URL}/api/admin/reject-user/${userId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("User rejected");
      fetchPendingUsers();
    } catch (error) {
      console.error("❌ Reject error:", error);
      alert("Failed to reject user");
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>{error}</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Admin Panel - Pending User Approvals</h1>

      {pendingUsers.length === 0 ? (
        <p style={styles.emptyMessage}>No pending users</p>
      ) : (
        <div style={styles.usersList}>
          {pendingUsers.map((user: any) => (
            <div key={user._id} style={styles.userCard}>
              <img
                src={user.image || "https://github.com/shadcn.png"}
                alt={user.channelname}
                style={styles.userImage}
              />
              <div style={styles.userInfo}>
                <h3 style={styles.channelName}>
                  {user.channelname || user.name}
                </h3>
                <p style={styles.email}>{user.email}</p>
                <p style={styles.date}>
                  Registered: {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div style={styles.actions}>
                <button
                  onClick={() => handleApprove(user._id)}
                  style={styles.approveButton}
                >
                  ✓ Approve
                </button>
                <button
                  onClick={() => handleReject(user._id)}
                  style={styles.rejectButton}
                >
                  ✗ Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: "20px",
    maxWidth: "1200px",
    margin: "0 auto",
    backgroundColor: "#0f0f0f",
    minHeight: "100vh",
    color: "#fff",
  },
  title: {
    fontSize: "28px",
    marginBottom: "30px",
    color: "#fff",
  },
  loading: {
    textAlign: "center",
    padding: "40px",
    fontSize: "18px",
  },
  error: {
    textAlign: "center",
    padding: "40px",
    color: "#ff4444",
    fontSize: "18px",
  },
  emptyMessage: {
    textAlign: "center",
    padding: "40px",
    color: "#aaa",
    fontSize: "16px",
  },
  usersList: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  userCard: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    backgroundColor: "#272727",
    padding: "20px",
    borderRadius: "8px",
    border: "1px solid #3f3f3f",
  },
  userImage: {
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    objectFit: "cover",
  },
  userInfo: {
    flex: 1,
  },
  channelName: {
    fontSize: "20px",
    marginBottom: "5px",
    color: "#fff",
  },
  email: {
    fontSize: "14px",
    color: "#aaa",
    marginBottom: "5px",
  },
  date: {
    fontSize: "12px",
    color: "#888",
  },
  actions: {
    display: "flex",
    gap: "10px",
  },
  approveButton: {
    padding: "10px 20px",
    backgroundColor: "#065fd4",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "bold",
  },
  rejectButton: {
    padding: "10px 20px",
    backgroundColor: "#cc0000",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "bold",
  },
};

export default AdminPanel;
