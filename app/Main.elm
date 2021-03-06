port module Main exposing (..)

import Browser
import Button
import Config exposing (Config)
import Html exposing (Html, aside, div, h1, h2, li, main_, section, text, ul)
import Html.Attributes exposing (class)
import Html.Events exposing (onClick)
import Json.Decode as Decode exposing (Error, decodeValue, errorToString)
import Json.Encode exposing (Value)
import Test exposing (Status(..), Test)


main : Program Config Model Msg
main =
    Browser.element
        { init = init
        , view = view
        , update = update
        , subscriptions = subscriptions
        }


type alias Model =
    { tests : List Test
    , error : Maybe Error
    , config : Config
    }


init : Config -> ( Model, Cmd Msg )
init config =
    ( { config = config, tests = [], error = Nothing }, Cmd.none )


port approveChange : String -> Cmd msg


port rejectChange : String -> Cmd msg


port apply : () -> Cmd msg


port testsUpdated : (Json.Encode.Value -> msg) -> Sub msg


type Msg
    = TestsUpdated (Result Error (List Test))
    | ApproveChange String
    | RejectChange String
    | Apply


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        TestsUpdated (Ok tests) ->
            ( { model | tests = tests, error = Nothing }, Cmd.none )

        TestsUpdated (Err error) ->
            ( { model | error = Just error }, Cmd.none )

        ApproveChange slug ->
            ( model, approveChange slug )

        RejectChange slug ->
            ( model, rejectChange slug )

        Apply ->
            ( model, apply () )


view : Model -> Html Msg
view model =
    case model.error of
        Nothing ->
            let
                displayTest =
                    Test.view False model.config ApproveChange RejectChange

                running =
                    List.filter (\test -> test.status == Running) model.tests

                failures =
                    List.filter (\test -> test.status == Failure) model.tests

                approved =
                    List.filter (\test -> test.status == Approved) model.tests

                rejected =
                    List.filter (\test -> test.status == Rejected) model.tests

                successful =
                    List.filter (\test -> test.status == Success) model.tests

                new =
                    List.filter (\test -> test.status == New) model.tests

                canApply =
                    List.length failures + List.length rejected == 0 && List.length new + List.length approved > 0

                displayIfNotZero number content =
                    if number > 0 then
                        content

                    else
                        text ""
            in
            main_ []
                [ aside []
                    [ h1 [] [ text "Vision" ]
                    , ul []
                        [ li [] [ text <| (String.fromInt <| List.length model.tests) ++ " tests" ]
                        , displayIfNotZero (List.length running) <| li [] [ text <| String.fromInt (List.length running) ++ " running" ]
                        , displayIfNotZero (List.length failures) <| li [] [ text <| String.fromInt (List.length failures) ++ " failed" ]
                        , displayIfNotZero (List.length approved) <| li [] [ text <| String.fromInt (List.length approved) ++ " approved" ]
                        , displayIfNotZero (List.length rejected) <| li [] [ text <| String.fromInt (List.length rejected) ++ " rejected" ]
                        , displayIfNotZero (List.length new) <| li [] [ text <| String.fromInt (List.length new) ++ " new" ]
                        , displayIfNotZero (List.length successful) <| li [] [ text <| String.fromInt (List.length successful) ++ " successful" ]
                        ]
                    , if canApply then
                        Button.positive Apply "Apply"

                      else
                        text ""
                    ]
                , div [ class "dashboard-tests" ]
                    [ displayIfNotZero (List.length failures) <|
                        section []
                            [ h2 [ class "bg-yellow" ] [ text "Visual changes" ]
                            , ul [] <| List.map displayTest failures
                            ]
                    , displayIfNotZero (List.length rejected) <|
                        section []
                            [ h2 [ class "bg-red" ] [ text "Rejected changes" ]
                            , ul [] <| List.map displayTest rejected
                            ]
                    , displayIfNotZero (List.length new) <|
                        section []
                            [ h2 [ class "bg-blue" ] [ text "New tests" ]
                            , ul [] <| List.map displayTest new
                            ]
                    , displayIfNotZero (List.length approved) <|
                        section []
                            [ h2 [ class "bg-green" ] [ text "Approved changes" ]
                            , ul [] <| List.map displayTest approved
                            ]
                    , displayIfNotZero (List.length successful) <|
                        section []
                            [ h2 [ class "bg-green" ] [ text "No change" ]
                            , ul [] <| List.map displayTest successful
                            ]
                    ]
                ]

        Just error ->
            div [] [ text <| errorToString error ]


subscriptions : Model -> Sub Msg
subscriptions _ =
    testsUpdated (\raw -> TestsUpdated <| decodeValue (Decode.list Test.decoder) raw)
