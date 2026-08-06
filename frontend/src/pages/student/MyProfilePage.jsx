import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { userApi } from "../../api/userApi";
import { studentApi } from "../../api/studentApi";
import { User, Phone, Mail, Home, Users, Calendar, Award } from "lucide-react";
import { format } from "date-fns";

export default function MyProfilePage() {
  const [user, setUser] = useState(null);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const [userRes, meRes] = await Promise.all([userApi.me(), studentApi.me()]);
      setUser(userRes.data);
      setMe(meRes.data);
      setLoading(false);
    })();
  }, []);

  if (loading) return <LoadingSpinner />;

  const merged = { ...(user || {}), ...(me || {}) };

  // Helper to safely format dates
  const formatDate = (d) => {
    if (!d) return "—";
    try {
      const dt = typeof d === "string" ? new Date(d) : d;
      return isNaN(dt.getTime()) ? "—" : format(dt, "dd MMM yyyy");
    } catch (e) {
      return "—";
    }
  };

  const firstName = merged.name || merged.fullName || merged.full_name || "—";
  const rollNumber = merged.rollNumber || merged.roll_number || "—";
  const className = merged.className || merged.class_name || merged.class || "—";
  const section = merged.section || "";
  const gender = merged.gender || merged.sex || "—";
  const dob = merged.dateOfBirth || merged.date_of_birth || merged.dob || null;
  const bloodGroup = merged.bloodGroup || merged.blood_group || merged.bloodType || "—";

  const email = merged.email || "—";
  const phone = merged.phone || "—";
  const address = merged.address || merged.addr || merged.permanentAddress || "—";

  const parentName = merged.parentName || merged.guardianName || merged.parent_name || "—";
  const parentRelationship = merged.parentRelationship || merged.relationship || merged.guardianRelationship || "—";
  const parentEmail = merged.parentEmail || merged.parent_email || "—";
  const parentPhone = merged.parentPhone || merged.parent_phone || merged.guardianPhone || "—";

  const academicYear = merged.academicYear || merged.academic_year || "—";
  const admissionNumber = merged.admissionNumber || merged.admission_no || merged.admission || "—";
  const studentId = merged.studentId || merged.student_id || merged.id || "—";
  const role = merged.role || "Student";

  const profilePhoto = merged.profilePhotoUrl || merged.profile_photo_url || merged.profilePhoto || merged.profile_photo || null;

  const initials = (firstName || "").split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div>
      <PageHeader
        title="My Profile"
        subtitle="Review your student details. Request changes if something is incorrect."
      />

      <div className="max-w-6xl">
        <div className="rounded-[16px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow duration-150 overflow-hidden">
          <div className="flex items-start justify-between p-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Student Profile</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Personal and academic information</p>
            </div>
            <div>
              <button
                onClick={() => navigate("/student/profile/change-request")}
                className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 shadow-sm transition-colors"
              >
                Request a change
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left column: Personal + Contact stacked */}
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="h-24 w-24 flex-shrink-0 rounded-[12px] overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    {profilePhoto ? (
                      // eslint-disable-next-line jsx-a11y/img-redundant-alt
                      <img src={profilePhoto} alt="Profile photo" className="h-full w-full object-cover" />
                    ) : (
                      <div className="text-2xl font-semibold text-slate-700 dark:text-slate-200">{initials}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Full Name</div>
                    <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{firstName}</div>
                    <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">Role</div>
                    <div className="text-sm font-medium text-slate-900 dark:text-white">{role}</div>
                  </div>
                </div>

                <section className="rounded-[12px] border border-slate-100 dark:border-slate-800 p-4 bg-white dark:bg-slate-900 shadow-sm">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Personal Information</h3>
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-3">
                    <div className="flex justify-between">
                      <div className="text-sm text-slate-500 dark:text-slate-400">Roll Number</div>
                      <div className="font-semibold text-slate-900 dark:text-white">{rollNumber}</div>
                    </div>
                    <div className="flex justify-between">
                      <div className="text-sm text-slate-500 dark:text-slate-400">Class & Section</div>
                      <div className="font-semibold text-slate-900 dark:text-white">{className}{section ? ` • ${section}` : ""}</div>
                    </div>
                    <div className="flex justify-between">
                      <div className="text-sm text-slate-500 dark:text-slate-400">Gender</div>
                      <div className="font-semibold text-slate-900 dark:text-white">{gender}</div>
                    </div>
                    <div className="flex justify-between">
                      <div className="text-sm text-slate-500 dark:text-slate-400">Date of Birth</div>
                      <div className="font-semibold text-slate-900 dark:text-white">{formatDate(dob)}</div>
                    </div>
                    <div className="flex justify-between">
                      <div className="text-sm text-slate-500 dark:text-slate-400">Blood Group</div>
                      <div className="font-semibold text-slate-900 dark:text-white">{bloodGroup}</div>
                    </div>
                  </div>
                </section>

                <section className="rounded-[12px] border border-slate-100 dark:border-slate-800 p-4 bg-white dark:bg-slate-900 shadow-sm">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Contact Information</h3>
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-3">
                    <div className="flex justify-between">
                      <div className="text-sm text-slate-500 dark:text-slate-400">Email</div>
                      <div className="font-semibold text-slate-900 dark:text-white">{email}</div>
                    </div>
                    <div className="flex justify-between">
                      <div className="text-sm text-slate-500 dark:text-slate-400">Phone</div>
                      <div className="font-semibold text-slate-900 dark:text-white">{phone}</div>
                    </div>
                    <div className="flex justify-between">
                      <div className="text-sm text-slate-500 dark:text-slate-400">Address</div>
                      <div className="font-semibold text-slate-900 dark:text-white text-right max-w-[60%]">{address}</div>
                    </div>
                  </div>
                </section>
              </div>

              {/* Right column: Parent & Academic */}
              <div className="space-y-6">
                <section className="rounded-[12px] border border-slate-100 dark:border-slate-800 p-4 bg-white dark:bg-slate-900 shadow-sm">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Parent / Guardian</h3>
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-3">
                    <div className="flex justify-between">
                      <div className="text-sm text-slate-500 dark:text-slate-400">Name</div>
                      <div className="font-semibold text-slate-900 dark:text-white">{parentName}</div>
                    </div>
                    <div className="flex justify-between">
                      <div className="text-sm text-slate-500 dark:text-slate-400">Relationship</div>
                      <div className="font-semibold text-slate-900 dark:text-white">{parentRelationship}</div>
                    </div>
                    <div className="flex justify-between">
                      <div className="text-sm text-slate-500 dark:text-slate-400">Email</div>
                      <div className="font-semibold text-slate-900 dark:text-white">{parentEmail}</div>
                    </div>
                    <div className="flex justify-between">
                      <div className="text-sm text-slate-500 dark:text-slate-400">Phone</div>
                      <div className="font-semibold text-slate-900 dark:text-white">{parentPhone}</div>
                    </div>
                  </div>
                </section>

                <section className="rounded-[12px] border border-slate-100 dark:border-slate-800 p-4 bg-white dark:bg-slate-900 shadow-sm">
                  <div className="flex items-center gap-3">
                    <Award className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Academic Information</h3>
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-3">
                    <div className="flex justify-between">
                      <div className="text-sm text-slate-500 dark:text-slate-400">Academic Year</div>
                      <div className="font-semibold text-slate-900 dark:text-white">{academicYear}</div>
                    </div>
                    <div className="flex justify-between">
                      <div className="text-sm text-slate-500 dark:text-slate-400">Admission Number</div>
                      <div className="font-semibold text-slate-900 dark:text-white">{admissionNumber}</div>
                    </div>
                    <div className="flex justify-between">
                      <div className="text-sm text-slate-500 dark:text-slate-400">Role</div>
                      <div className="font-semibold text-slate-900 dark:text-white">{role}</div>
                    </div>
                  </div>
                </section>

                <section className="text-sm text-slate-500 dark:text-slate-400">Last updated: {merged.updatedAt || "—"}</section>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
