package com.kopick.tour;

import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TourPlaceRepository extends JpaRepository<TourPlace, Long> {
    Optional<TourPlace> findByContentId(String contentId);

    @Query("""
        select p from TourPlace p
        where p.active = true
          and (:region = '전국' or p.region = :region)
          and (:category = '전체' or p.category = :category)
          and (:sigunguCode = '' or p.sigunguCode = :sigunguCode)
          and (:detail = '전체' or p.detailCategory = :detail)
        order by p.updatedAt desc, p.id desc
        """)
    Page<TourPlace> search(
        @Param("region") String region,
        @Param("category") String category,
        @Param("sigunguCode") String sigunguCode,
        @Param("detail") String detail,
        Pageable pageable
    );
}
