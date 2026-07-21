package com.kopick.tour;

import java.util.Map;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/tour")
public class TourApiController {
    private final PlaceSearchService placeSearch;

    public TourApiController(PlaceSearchService placeSearch) {
        this.placeSearch = placeSearch;
    }

    @GetMapping("/places")
    public Map<String, Object> places(@RequestParam MultiValueMap<String, String> query) {
        return placeSearch.search(query);
    }
}
