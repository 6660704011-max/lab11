import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, Text, View, FlatList, TouchableOpacity, 
  Alert, ActivityIndicator, Modal, TextInput, StatusBar, Image 
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

const API_URL = 'http://fms.pnu.ac.th:5000'; 

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null); 
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ 
    name: '', email: '', student_id: '', password: '', role: 'student' 
  });

  const fetchUsers = async (userParam = null) => {
    const user = userParam || currentUser;
    if (!user) return;
    try {
      const res = await fetch(`${API_URL}/users/${user.role}/${user.student_id}`);
      const data = await res.json();
      setUsers(data);
    } catch (e) { console.error(e); }
  };

  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) return Alert.alert("กรุณากรอกข้อมูล");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.user);
        setIsLoggedIn(true);
        fetchUsers(data.user);
      } else { Alert.alert(data.message); }
    } catch (e) { Alert.alert("Server Error"); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    // ตรวจสอบข้อมูลเบื้องต้น
    if (!formData.name || !formData.email || !formData.student_id) {
      return Alert.alert("แจ้งเตือน", "กรุณากรอกข้อมูลให้ครบถ้วน");
    }
    if (!editingId && !formData.password) {
      return Alert.alert("แจ้งเตือน", "สมาชิกใหม่ต้องมีรหัสผ่าน");
    }

    const url = editingId ? `${API_URL}/update/${editingId}` : `${API_URL}/register`;
    const method = editingId ? 'PUT' : 'POST';
    
    setLoading(true);
    try {
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setModalVisible(false);
        fetchUsers();
        Alert.alert("สำเร็จ", "ดำเนินการเรียบร้อย");
      } else {
        Alert.alert("ผิดพลาด", data.message);
      }
    } catch (e) { Alert.alert("เชื่อมต่อไม่สำเร็จ"); }
    finally { setLoading(false); }
  };

  const confirmDelete = (id, name) => {
    Alert.alert("ยืนยัน", `ลบคุณ ${name}?`, [
      { text: "ยกเลิก" },
      { text: "ลบ", onPress: async () => {
          await fetch(`${API_URL}/delete/${id}`, { method: 'DELETE' });
          fetchUsers();
      }, style: 'destructive' }
    ]);
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.5,
    });
    if (!result.canceled) {
      const uploadData = new FormData();
      uploadData.append('avatar', {
        uri: result.assets[0].uri, type: 'image/jpeg', name: 'avatar.jpg',
      });
      const res = await fetch(`${API_URL}/upload-avatar/${currentUser.id}`, {
        method: 'POST', body: uploadData, headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data = await res.json();
      if(data.success) {
        setCurrentUser({...currentUser, avatar_url: data.avatar_url});
        fetchUsers();
      }
    }
  };

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.loginContainer}>
        <Text style={styles.loginTitle}>PNU Login</Text>
        <TextInput style={styles.input} placeholder="Email" value={loginEmail} onChangeText={setLoginEmail} autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Password" value={loginPassword} onChangeText={setLoginPassword} secureTextEntry />
        <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={{color:'#fff', fontWeight:'bold'}}>Login</Text>}
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
            <TouchableOpacity onPress={pickImage}>
                <Image 
                    source={currentUser?.avatar_url ? { uri: `${API_URL}${currentUser.avatar_url}?t=${new Date().getTime()}` } : { uri: 'https://via.placeholder.com/100' }} 
                    style={styles.avatar} 
                />
            </TouchableOpacity>
            <View style={{flex:1, marginLeft: 12}}>
                <Text style={styles.headerTitle}>{currentUser.name}</Text>
                <Text style={styles.roleText}>{currentUser.role.toUpperCase()}</Text>
            </View>
            <View style={{flexDirection:'row'}}>
                {currentUser.role === 'admin' && (
                    <TouchableOpacity style={styles.addBtn} onPress={() => {
                        setEditingId(null);
                        setFormData({ name: '', email: '', student_id: '', password: '', role: 'student' });
                        setModalVisible(true);
                    }}><Text style={{color:'#fff'}}>+ เพิ่ม</Text></TouchableOpacity>
                )}
                <TouchableOpacity style={styles.logoutBtn} onPress={() => setIsLoggedIn(false)}><Text style={{color:'#fff'}}>ออก</Text></TouchableOpacity>
            </View>
        </View>

        <FlatList
          data={users}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{paddingBottom: 20}}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Image source={item.avatar_url ? { uri: `${API_URL}${item.avatar_url}?t=${new Date().getTime()}` } : { uri: 'https://via.placeholder.com/100' }} style={styles.cardAvatar} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.nameText}>{item.name}</Text>
                <Text style={styles.subText}>{item.email} | ID: {item.student_id}</Text>
              </View>
              {currentUser.role === 'admin' && (
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.editBtn} onPress={() => {
                      setEditingId(item.id);
                      setFormData({ name: item.name, email: item.email, student_id: item.student_id, role: item.role });
                      setModalVisible(true);
                  }}><Text style={styles.btnText}>แก้</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.delBtn} onPress={() => confirmDelete(item.id, item.name)}><Text style={styles.btnText}>ลบ</Text></TouchableOpacity>
                </View>
              )}
            </View>
          )}
        />

        <Modal visible={modalVisible} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{editingId ? 'แก้ไขสมาชิก' : 'เพิ่มสมาชิกใหม่'}</Text>
              <TextInput style={styles.input} placeholder="ชื่อ" value={formData.name} onChangeText={(t) => setFormData({...formData, name: t})} />
              <TextInput style={styles.input} placeholder="อีเมล" value={formData.email} onChangeText={(t) => setFormData({...formData, email: t})} autoCapitalize="none" />
              <TextInput style={styles.input} placeholder="Student ID" value={formData.student_id} onChangeText={(t) => setFormData({...formData, student_id: t})} />
              {!editingId && <TextInput style={styles.input} placeholder="รหัสผ่าน" secureTextEntry onChangeText={(t) => setFormData({...formData, password: t})} />}
              <TextInput style={styles.input} placeholder="Role (admin/student)" value={formData.role} onChangeText={(t) => setFormData({...formData, role: t.toLowerCase()})} />
              
              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalBtn, {backgroundColor: '#ccc'}]} onPress={() => setModalVisible(false)}><Text>ยกเลิก</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, {backgroundColor: '#1a237e'}]} onPress={handleSave} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={{color:'#fff'}}>บันทึก</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  loginContainer: { flex: 1, justifyContent: 'center', padding: 25, backgroundColor: '#fff' },
  loginTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 30, textAlign: 'center', color: '#1a237e' },
  header: { padding: 15, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', elevation: 3 },
  avatar: { width: 55, height: 55, borderRadius: 28, borderWidth: 1, borderColor: '#ddd' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  roleText: { fontSize: 12, color: '#1a237e', fontWeight: 'bold' },
  input: { borderBottomWidth: 1, borderColor: '#ddd', marginBottom: 15, padding: 10, fontSize: 16 },
  loginBtn: { backgroundColor: '#1a237e', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  card: { backgroundColor: '#fff', padding: 15, marginHorizontal: 15, marginTop: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', elevation: 2 },
  cardAvatar: { width: 45, height: 45, borderRadius: 22 },
  nameText: { fontSize: 16, fontWeight: 'bold' },
  subText: { color: '#666', fontSize: 13 },
  actionRow: { flexDirection: 'row' },
  editBtn: { backgroundColor: '#ffa000', padding: 8, borderRadius: 6, marginRight: 6 },
  delBtn: { backgroundColor: '#d32f2f', padding: 8, borderRadius: 6 },
  btnText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', width: '90%', padding: 25, borderRadius: 15 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  modalBtn: { padding: 14, borderRadius: 10, width: '47%', alignItems: 'center' },
  addBtn: { backgroundColor: '#2e7d32', padding: 10, borderRadius: 8, marginRight: 8 },
  logoutBtn: { backgroundColor: '#c62828', padding: 10, borderRadius: 8 }
});

