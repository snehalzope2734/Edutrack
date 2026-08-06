package com.edutrack.repository.mongodb;

import com.edutrack.model.document.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

public interface NotificationRepository extends MongoRepository<Notification, String> {

    @Query("{ '$or': [ { 'recipients': 'ALL' }, { 'recipients': ?0 }, { 'recipients': ?1 } ] }")
    Page<Notification> findForUser(String userId, String classTag, Pageable pageable);

    @Query("{ '$or': [ { 'recipients': 'ALL' }, { 'recipients': ?0 }, { 'recipients': ?1 }, { 'recipients': 'ALL_TEACHERS' } ] }")
    Page<Notification> findForTeacher(String userId, String classTag, Pageable pageable);
}
