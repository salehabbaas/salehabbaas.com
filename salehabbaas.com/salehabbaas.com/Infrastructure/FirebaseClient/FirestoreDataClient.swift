import Foundation

#if canImport(FirebaseFirestore)
import FirebaseFirestore
#endif

@MainActor
final class FirestoreDataClient {
  private let authStore: AuthStore

  init(authStore: AuthStore) {
    self.authStore = authStore
  }

  func fetchPublicProfileHeadline() async -> String {
    #if canImport(FirebaseFirestore)
    do {
      let snap = try await Firestore.firestore().collection("siteContent").document("profile").getDocument()
      let data = snap.data() ?? [:]
      return (data["headline"] as? String) ?? (data["summary"] as? String) ?? ""
    } catch {
      return ""
    }
    #else
    return ""
    #endif
  }

  func fetchPublicCounters() async -> (projects: Int, services: Int, blogPosts: Int) {
    #if canImport(FirebaseFirestore)
    do {
      async let projects = Firestore.firestore().collection("projects").whereField("status", isEqualTo: "published").getDocuments()
      async let services = Firestore.firestore().collection("services").getDocuments()
      async let blog = Firestore.firestore().collection("blogPosts").whereField("status", isEqualTo: "published").getDocuments()

      let (p, s, b) = try await (projects, services, blog)
      return (p.documents.count, s.documents.count, b.documents.count)
    } catch {
      return (0, 0, 0)
    }
    #else
    return (0, 0, 0)
    #endif
  }

  func fetchCMSSnapshot() async -> (profileExists: Bool, mediaCount: Int, blogCount: Int) {
    #if canImport(FirebaseFirestore)
    do {
      async let profile = Firestore.firestore().collection("siteContent").document("profile").getDocument()
      async let media = Firestore.firestore().collection("mediaAssets").limit(to: 300).getDocuments()
      async let blog = Firestore.firestore().collection("blogPosts").limit(to: 300).getDocuments()

      let (p, m, b) = try await (profile, media, blog)
      return (p.exists, m.documents.count, b.documents.count)
    } catch {
      return (false, 0, 0)
    }
    #else
    return (false, 0, 0)
    #endif
  }

  func fetchBookingsCount() async -> Int {
    #if canImport(FirebaseFirestore)
    do {
      let snap = try await Firestore.firestore().collection("bookings").limit(to: 500).getDocuments()
      return snap.documents.count
    } catch {
      return 0
    }
    #else
    return 0
    #endif
  }

  func fetchNotificationCount() async -> Int {
    #if canImport(FirebaseFirestore)
    guard !authStore.uid.isEmpty else { return 0 }
    do {
      let snap = try await Firestore
        .firestore()
        .collection("users")
        .document(authStore.uid)
        .collection("notifications")
        .whereField("state", isEqualTo: "unread")
        .limit(to: 200)
        .getDocuments()
      return snap.documents.count
    } catch {
      return 0
    }
    #else
    return 0
    #endif
  }

  func fetchCreatorSnapshot() async -> (contentItems: Int, templates: Int, variants: Int, scheduled: Int) {
    #if canImport(FirebaseFirestore)
    do {
      async let contentItems = Firestore.firestore().collection("contentItems").limit(to: 400).getDocuments()
      async let templates = Firestore.firestore().collection("creatorTemplates").limit(to: 200).getDocuments()
      async let variants = Firestore.firestore().collectionGroup("variants").limit(to: 600).getDocuments()

      let (itemsSnap, templatesSnap, variantsSnap) = try await (contentItems, templates, variants)
      let scheduled = variantsSnap.documents.filter { doc in
        let data = doc.data()
        return data["scheduledAt"] != nil
      }.count

      return (itemsSnap.documents.count, templatesSnap.documents.count, variantsSnap.documents.count, scheduled)
    } catch {
      return (0, 0, 0, 0)
    }
    #else
    return (0, 0, 0, 0)
    #endif
  }

  func fetchResumeSnapshot() async -> (documents: Int, templates: Int, versions: Int) {
    #if canImport(FirebaseFirestore)
    guard !authStore.uid.isEmpty else { return (0, 0, 0) }
    do {
      async let docs = Firestore.firestore().collection("resumeDocuments").whereField("ownerId", isEqualTo: authStore.uid).limit(to: 400).getDocuments()
      async let templates = Firestore.firestore().collection("resumeTemplates").whereField("ownerId", isEqualTo: authStore.uid).limit(to: 200).getDocuments()
      async let versions = Firestore.firestore().collection("resumeVersions").whereField("ownerId", isEqualTo: authStore.uid).limit(to: 400).getDocuments()

      let (d, t, v) = try await (docs, templates, versions)
      return (d.documents.count, t.documents.count, v.documents.count)
    } catch {
      return (0, 0, 0)
    }
    #else
    return (0, 0, 0)
    #endif
  }

  func fetchJobsSnapshot() async -> (jobs: Int, interviewing: Int, offers: Int, companies: Int) {
    #if canImport(FirebaseFirestore)
    guard !authStore.uid.isEmpty else { return (0, 0, 0, 0) }
    do {
      async let jobs = Firestore.firestore().collection("jobTrackerJobs").whereField("ownerId", isEqualTo: authStore.uid).limit(to: 600).getDocuments()
      async let companies = Firestore.firestore().collection("trackedCompanies").whereField("ownerId", isEqualTo: authStore.uid).limit(to: 400).getDocuments()

      let (jobsSnap, companiesSnap) = try await (jobs, companies)
      let interviewing = jobsSnap.documents.filter { ($0.data()["status"] as? String) == "interviewing" }.count
      let offers = jobsSnap.documents.filter { ($0.data()["status"] as? String) == "offer" }.count
      return (jobsSnap.documents.count, interviewing, offers, companiesSnap.documents.count)
    } catch {
      return (0, 0, 0, 0)
    }
    #else
    return (0, 0, 0, 0)
    #endif
  }

  func fetchPublicProfile() async -> PublicProfileDTO {
    #if canImport(FirebaseFirestore)
    do {
      let snap = try await Firestore.firestore().collection("siteContent").document("profile").getDocument()
      let data = snap.data() ?? [:]
      return PublicProfileDTO(
        name: (data["name"] as? String) ?? "Saleh Abbaas",
        headline: (data["headline"] as? String) ?? "",
        bio: (data["bio"] as? String) ?? "",
        location: data["location"] as? String,
        email: data["email"] as? String
      )
    } catch {
      return PublicProfileDTO(
        name: "Saleh Abbaas",
        headline: "",
        bio: "",
        location: nil,
        email: nil
      )
    }
    #else
    return PublicProfileDTO(
      name: "Saleh Abbaas",
      headline: "",
      bio: "",
      location: nil,
      email: nil
    )
    #endif
  }

  func fetchPublicProjects(limit: Int = 20) async -> [PublicProjectDTO] {
    #if canImport(FirebaseFirestore)
    do {
      let snap = try await Firestore.firestore().collection("projects").whereField("status", isEqualTo: "published").limit(to: limit).getDocuments()
      return snap.documents.map { doc in
        let data = doc.data()
        return PublicProjectDTO(
          id: doc.documentID,
          slug: (data["slug"] as? String) ?? doc.documentID,
          title: (data["title"] as? String) ?? "",
          description: (data["description"] as? String) ?? "",
          status: (data["status"] as? String) ?? "published"
        )
      }
    } catch {
      return []
    }
    #else
    return []
    #endif
  }

  func fetchPublicBlogPosts(limit: Int = 20) async -> [PublicBlogDTO] {
    #if canImport(FirebaseFirestore)
    do {
      let snap = try await Firestore.firestore().collection("blogPosts").whereField("status", isEqualTo: "published").limit(to: limit).getDocuments()
      return snap.documents.map { doc in
        let data = doc.data()
        return PublicBlogDTO(
          id: doc.documentID,
          slug: (data["slug"] as? String) ?? doc.documentID,
          title: (data["title"] as? String) ?? "",
          excerpt: (data["excerpt"] as? String) ?? "",
          publishedAt: (data["publishedAt"] as? String)
        )
      }
    } catch {
      return []
    }
    #else
    return []
    #endif
  }

  func fetchPublicAINews(limit: Int = 20) async -> [PublicCreatorNewsDTO] {
    #if canImport(FirebaseFirestore)
    do {
      let snap = try await Firestore
        .firestore()
        .collectionGroup("variants")
        .whereField("visibility", isEqualTo: "public")
        .whereField("pillar", isEqualTo: "AI")
        .limit(to: limit)
        .getDocuments()

      return snap.documents.map { doc in
        let data = doc.data()
        return PublicCreatorNewsDTO(
          id: doc.documentID,
          contentTitle: (data["contentTitle"] as? String) ?? "",
          platform: (data["platform"] as? String) ?? "",
          slug: (data["slug"] as? String) ?? doc.documentID,
          publishedAt: (data["publishedAt"] as? String)
        )
      }
    } catch {
      return []
    }
    #else
    return []
    #endif
  }
}
