import assert from "node:assert/strict";
import test from "node:test";
import { scoreNaverPlaceMatch } from "./naver-place-verification.ts";

test("같은 장소명과 도로명 주소는 높은 점수로 일치한다", () => {
  const score = scoreNaverPlaceMatch(
    "트라가 역삼점",
    "서울 강남구 테헤란로25길 46 1층",
    {
      title: "<b>트라가 역삼점</b>",
      roadAddress: "서울특별시 강남구 테헤란로25길 46",
      address: "서울특별시 강남구 역삼동 642-6",
    },
  );
  assert.ok(score >= 0.8);
});

test("본점 표기만 다른 같은 주소는 일치한다", () => {
  const score = scoreNaverPlaceMatch(
    "성수노루 본점",
    "서울 성동구 연무장길 31",
    {
      title: "성수노루",
      roadAddress: "서울특별시 성동구 연무장길 31",
    },
  );
  assert.ok(score >= 0.8);
});

test("장소명이 같아도 주소가 다르면 제외한다", () => {
  const score = scoreNaverPlaceMatch(
    "중앙공원",
    "경기 성남시 분당구 성남대로 550",
    {
      title: "중앙공원",
      roadAddress: "부산 부산진구 중앙대로 700",
    },
  );
  assert.equal(score, 0);
});

test("같은 도로의 다른 건물 번호는 제외한다", () => {
  const score = scoreNaverPlaceMatch(
    "테스트식당",
    "서울 강남구 테헤란로 10",
    {
      title: "테스트식당",
      roadAddress: "서울특별시 강남구 테헤란로 99",
    },
  );
  assert.equal(score, 0);
});

test("주소가 같아도 장소명이 다르면 제외한다", () => {
  const score = scoreNaverPlaceMatch(
    "한빛미술관",
    "서울 종로구 세종대로 1",
    {
      title: "푸른카페",
      roadAddress: "서울 종로구 세종대로 1",
    },
  );
  assert.equal(score, 0);
});
